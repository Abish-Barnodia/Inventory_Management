import { Request, Response } from 'express';
import { pool } from '../db';
import { parse } from 'csv-parse/sync';
import Tesseract from 'tesseract.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// --------------------------------------------------------
// STOCK ENTRIES (GRN / Purchases)
// --------------------------------------------------------

export const getStockEntries = async (req: Request, res: Response) => {
  try {
    const hotelId = req.headers['x-hotel-id'] as string;
    let query = 'SELECT * FROM stock_entries WHERE 1=1';
    const params: any[] = [];
    if (hotelId) {
      query += ' AND hotel_id = $1';
      params.push(hotelId);
    }
    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching stock entries:', error);
    res.status(500).json({ error: 'Failed to fetch stock entries' });
  }
};

export const createStockEntry = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { invoiceNumber, vendorName, totalAmount, paymentStatus, items } = req.body;
    const hotelId = req.headers['x-hotel-id'] as string;

    const entryResult = await client.query(
      `INSERT INTO stock_entries (invoice_number, vendor_name, total_amount, payment_status, batch_upload_id, hotel_id)
       VALUES ($1, $2, $3, $4, NULL, $5) RETURNING *`,
      [invoiceNumber, vendorName, totalAmount, paymentStatus, hotelId || null]
    );
    const entryId = entryResult.rows[0].id;

    let itemsDescription = '';
    if (items && Array.isArray(items) && items.length > 0) {
      itemsDescription = ' - ' + items.map((i: any) => `${i.itemName} (Qty: ${i.quantity})`).join(', ');
    }

    // Auto-Capture Purchase Expense (Module 1)
    await client.query(
      `INSERT INTO expenses (expense_type, description, category, amount, payment_method, vendor, expense_date, stock_entry_id, batch_upload_id, hotel_id)
       VALUES ('Purchase', $1, 'Inventory Stock', $2, 'Cash', $3, CURRENT_DATE, $4, NULL, $5)`,
      [`Purchase Invoice #${invoiceNumber || entryId}${itemsDescription}`, totalAmount, vendorName || 'Supplier', entryId, hotelId || null]
    );

    // items array: { itemName: string, quantity: number }
    if (items && Array.isArray(items)) {
      for (const item of items) {
        await client.query(
          `UPDATE items SET stock_quantity = stock_quantity + $1, updated_at = NOW() WHERE name = $2`,
          [item.quantity, item.itemName]
        );
      }
    }

    // Write Audit Log
    await client.query(
      `INSERT INTO audit_log (action, entity_type, entity_id, reason, metadata)
       VALUES ('CREATE_STOCK_ENTRY', 'stock_entries', $1, 'Single Stock Entry Creation', $2)`,
      [entryId, JSON.stringify({ invoiceNumber, totalAmount, itemCount: items?.length || 0 })]
    );

    await client.query('COMMIT');
    res.status(201).json(entryResult.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating stock entry:', error);
    res.status(500).json({ error: 'Failed to create stock entry' });
  } finally {
    client.release();
  }
};

export const bulkImportStockEntries = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const client = await pool.connect();
    let importedCount = 0;
    const batchUploadId = 'BATCH_' + Date.now();
    let batchTotal = 0;
    const hotelId = req.headers['x-hotel-id'] as string;
    const extractedItems = [];
    
    try {
      await client.query('BEGIN');
      
      const isImage = req.file.mimetype.startsWith('image/');
      
      if (isImage) {
        let extractedItemsList: any[] = [];
        try {
          // Run offline OCR using Tesseract
          const { data: { text } } = await Tesseract.recognize(req.file.buffer, 'eng');
          console.log("OCR Extracted Text:\n", text);
          
          const lines = text.split('\n');
          // Advanced Regex: captures Item Name, Quantity, Unit, Price
          // Example: "Fresh Paneer  45  ke  320.00" (Handles OCR typos like ke, ki for kg)
          const itemRegex = /([A-Za-z][^\d]{2,})\s+(\d+(?:\.\d+)?)\s*(kg|l|ml|g|pcs|box|pkt|ke|ki)\s+(\d+(?:\.\d+)?)/i;
          
          for (const line of lines) {
            const match = line.match(itemRegex);
            if (match) {
              const itemName = match[1].trim();
              const quantity = Number(match[2]);
              let unit = match[3].toLowerCase();
              if (unit === 'ke' || unit === 'ki') unit = 'kg'; // Fix OCR typos
              const price = Number(match[4]) || 0;
              const totalLineAmount = quantity * price;
              
              if (itemName && itemName.length > 2 && quantity > 0) {
                // Heuristic for Auto-Category
                let category = "Groceries";
                const lowerName = itemName.toLowerCase();
                if (/(chicken|mutton|fish|meat|pork|beef)/.test(lowerName)) {
                   category = "Meat & Poultry";
                } else if (/(milk|paneer|cheese|butter|curd|cream)/.test(lowerName)) {
                   category = "Dairy";
                } else if (/(tomato|potato|onion|cabbage|carrot|spinach|garlic|ginger|chilli)/.test(lowerName)) {
                   category = "Vegetables";
                } else if (/(apple|banana|mango|orange|grape|papaya)/.test(lowerName)) {
                   category = "Fruits";
                } else if (/(coke|pepsi|sprite|water|juice|soda|coffee|tea)/.test(lowerName)) {
                   category = "Beverages";
                }

                extractedItemsList.push({
                  item_name: itemName,
                  quantity: quantity,
                  unit: unit,
                  unit_price: price,
                  total_price: totalLineAmount,
                  category: category
                });
              }
            }
          }
          console.log("Tesseract Extracted Items:", extractedItemsList);
        } catch (error) {
          console.error("Error using Tesseract OCR:", error);
          return res.status(500).json({ error: 'Failed to process image with OCR' });
        }

        for (const item of extractedItemsList) {
          const itemName = item.item_name;
          const quantity = Number(item.quantity) || 0;
          const unit = item.unit || 'pcs';
          const price = Number(item.unit_price) || 0;
          const totalLineAmount = Number(item.total_price) || (quantity * price);
          const category = item.category || 'Inventory Stock';
          
          if (itemName && quantity > 0) {
            const entryResult = await client.query(
              `INSERT INTO stock_entries (invoice_number, vendor_name, total_amount, payment_status, batch_upload_id, hotel_id)
               VALUES ($1, $2, $3, 'unpaid', $4, $5) RETURNING id`,
              [`BULK-AI-${batchUploadId}`, 'AI Scanned Invoice', totalLineAmount, batchUploadId, hotelId || null]
            );
            const entryId = entryResult.rows[0].id;
  
            if (totalLineAmount > 0) {
              await client.query(
                `INSERT INTO expenses (expense_type, description, category, amount, payment_method, vendor, expense_date, stock_entry_id, batch_upload_id, hotel_id)
                 VALUES ('Purchase', $1, $2, $3, 'Cash', 'AI Scanned Invoice', CURRENT_DATE, $4, $5, $6)`,
                [`AI Import: ${itemName} (Qty: ${quantity} ${unit})`, category, totalLineAmount, entryId, batchUploadId, hotelId || null]
              );
            }
            batchTotal += totalLineAmount;
  
            await client.query(
              `UPDATE items SET stock_quantity = stock_quantity + $1, updated_at = NOW() WHERE LOWER(name) = LOWER($2)`,
              [quantity, itemName]
            );
            importedCount++;
            
            extractedItems.push({
              itemName: itemName,
              quantity: quantity,
              unit: unit,
              price: price,
              category: category
            });
          }
        }
      } else {
        // CSV Parsing logic
        const fileContent = req.file.buffer.toString('utf-8');
        const records = parse(fileContent, { columns: true, skip_empty_lines: true });
        
        for (const record of records) {
          const itemName = record['Item Name'] || record['item_name'];
          const quantity = Number(record['Quantity'] || record['quantity']);
          const price = Number(record['Price'] || record['price']) || 0;
          const totalLineAmount = quantity * price;
          
          if (itemName && quantity > 0) {
            const entryResult = await client.query(
              `INSERT INTO stock_entries (invoice_number, vendor_name, total_amount, payment_status, batch_upload_id, hotel_id)
               VALUES ($1, $2, $3, 'unpaid', $4, $5) RETURNING id`,
              [`BULK-${batchUploadId}`, 'Bulk Import Vendor', totalLineAmount, batchUploadId, hotelId || null]
            );
            const entryId = entryResult.rows[0].id;
  
            if (totalLineAmount > 0) {
              await client.query(
                `INSERT INTO expenses (expense_type, description, category, amount, payment_method, vendor, expense_date, stock_entry_id, batch_upload_id, hotel_id)
                 VALUES ('Purchase', $1, 'Inventory Stock', $2, 'Cash', 'Bulk Import Vendor', CURRENT_DATE, $3, $4, $5)`,
                [`Bulk Import: ${itemName} (Qty: ${quantity}) @ ₹${price}`, totalLineAmount, entryId, batchUploadId, hotelId || null]
              );
            }
            batchTotal += totalLineAmount;
  
            await client.query(
              `UPDATE items SET stock_quantity = stock_quantity + $1, updated_at = NOW() WHERE LOWER(name) = LOWER($2)`,
              [quantity, itemName]
            );
            importedCount++;
            extractedItems.push({ itemName, quantity, price });
          }
        }
      }

      // Write Audit Log for Bulk
      await client.query(
        `INSERT INTO audit_log (action, entity_type, entity_id, reason, metadata)
         VALUES ('BULK_STOCK_ENTRY', 'batch', $1, 'Bulk Stock File Upload', $2)`,
        [batchUploadId, JSON.stringify({ importedCount, batchTotal, isImage })]
      );

      await client.query('COMMIT');
      res.json({ message: 'Bulk import successful', itemsUpdated: importedCount, batchUploadId, extractedItems });
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error processing bulk stock import:', error);
    res.status(500).json({ error: 'Failed to process stock entries file' });
  }
};

// --------------------------------------------------------
// STOCK REQUESTS (Issuances)
// --------------------------------------------------------

export const getStockRequests = async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT r.*, 
             json_agg(json_build_object('itemName', i.item_name, 'quantityRequested', i.quantity_requested, 'quantityApproved', i.quantity_approved)) as items
      FROM stock_requests r
      LEFT JOIN stock_request_items i ON r.id = i.request_id
      GROUP BY r.id
      ORDER BY r.created_at DESC
    `);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching stock requests:', error);
    res.status(500).json({ error: 'Failed to fetch stock requests' });
  }
};

export const createStockRequest = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { department, requestedBy, items } = req.body;
    const requestNumber = 'SR-' + Date.now();

    const requestResult = await client.query(
      `INSERT INTO stock_requests (request_number, department, requested_by, status)
       VALUES ($1, $2, $3, 'pending') RETURNING *`,
      [requestNumber, department, requestedBy]
    );
    const requestId = requestResult.rows[0].id;

    if (items && Array.isArray(items)) {
      for (const item of items) {
        await client.query(
          `INSERT INTO stock_request_items (request_id, item_name, quantity_requested) VALUES ($1, $2, $3)`,
          [requestId, item.itemName, item.quantityRequested]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json(requestResult.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating stock request:', error);
    res.status(500).json({ error: 'Failed to create stock request' });
  } finally {
    client.release();
  }
};

export const updateStockRequestStatus = async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { status, itemsApproved } = req.body;

    const requestResult = await client.query(
      `UPDATE stock_requests SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (requestResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Stock request not found' });
    }

    // If approved, deduct from items table stock_quantity
    if (status === 'approved' && itemsApproved && Array.isArray(itemsApproved)) {
      for (const item of itemsApproved) {
        // Update request item details
        await client.query(
          `UPDATE stock_request_items SET quantity_approved = $1 WHERE request_id = $2 AND item_name = $3`,
          [item.quantityApproved, id, item.itemName]
        );

        // Deduct from master stock
        await client.query(
          `UPDATE items SET stock_quantity = GREATEST(stock_quantity - $1, 0), updated_at = NOW() WHERE name = $2`,
          [item.quantityApproved, item.itemName]
        );
      }
    }

    await client.query('COMMIT');
    res.json(requestResult.rows[0]);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error updating stock request:', error);
    res.status(500).json({ error: 'Failed to update stock request status' });
  } finally {
    client.release();
  }
};
