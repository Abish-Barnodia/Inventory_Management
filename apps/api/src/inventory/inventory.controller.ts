import { Request, Response } from 'express';
import { pool } from '../db';
import { parse } from 'csv-parse/sync';

// --------------------------------------------------------
// STOCK ENTRIES (GRN / Purchases)
// --------------------------------------------------------

export const getStockEntries = async (req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM stock_entries ORDER BY created_at DESC');
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

    const entryResult = await client.query(
      `INSERT INTO stock_entries (invoice_number, vendor_name, total_amount, payment_status, batch_upload_id)
       VALUES ($1, $2, $3, $4, NULL) RETURNING *`,
      [invoiceNumber, vendorName, totalAmount, paymentStatus]
    );
    const entryId = entryResult.rows[0].id;

    // Auto-Capture Purchase Expense (Module 1)
    await client.query(
      `INSERT INTO expenses (expense_type, description, category, amount, payment_method, vendor, expense_date, stock_entry_id, batch_upload_id)
       VALUES ('Purchase', $1, 'Inventory Stock', $2, 'Cash', $3, CURRENT_DATE, $4, NULL)`,
      [`Purchase Invoice #${invoiceNumber || entryId}`, totalAmount, vendorName || 'Supplier', entryId]
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
      return res.status(400).json({ error: 'No CSV file uploaded' });
    }

    const fileContent = req.file.buffer.toString('utf-8');
    const records = parse(fileContent, { columns: true, skip_empty_lines: true });
    
    const client = await pool.connect();
    let importedCount = 0;
    const batchUploadId = 'BATCH_' + Date.now();
    let batchTotal = 0;
    
    try {
      await client.query('BEGIN');
      
      for (const record of records) {
        const itemName = record['Item Name'] || record['item_name'];
        const quantity = Number(record['Quantity'] || record['quantity']);
        const price = Number(record['Price'] || record['price']) || 0;
        const totalLineAmount = quantity * price;
        
        if (itemName && quantity > 0) {
          // Create stock entry per row
          const entryResult = await client.query(
            `INSERT INTO stock_entries (invoice_number, vendor_name, total_amount, payment_status, batch_upload_id)
             VALUES ($1, $2, $3, 'unpaid', $4) RETURNING id`,
            [`BULK-${batchUploadId}`, 'Bulk Import Vendor', totalLineAmount, batchUploadId]
          );
          const entryId = entryResult.rows[0].id;

          // Auto-capture expense per row
          if (totalLineAmount > 0) {
            await client.query(
              `INSERT INTO expenses (expense_type, description, category, amount, payment_method, vendor, expense_date, stock_entry_id, batch_upload_id)
               VALUES ('Purchase', $1, 'Inventory Stock', $2, 'Cash', 'Bulk Import Vendor', CURRENT_DATE, $3, $4)`,
              [`Bulk Import: ${itemName}`, totalLineAmount, entryId, batchUploadId]
            );
          }
          batchTotal += totalLineAmount;

          // Update item stock directly for bulk import
          await client.query(
            `UPDATE items SET stock_quantity = stock_quantity + $1, updated_at = NOW() WHERE LOWER(name) = LOWER($2)`,
            [quantity, itemName]
          );
          importedCount++;
        }
      }

      // Write Audit Log for Bulk
      await client.query(
        `INSERT INTO audit_log (action, entity_type, entity_id, reason, metadata)
         VALUES ('BULK_STOCK_ENTRY', 'batch', $1, 'Bulk Stock CSV Upload', $2)`,
        [batchUploadId, JSON.stringify({ importedCount, batchTotal })]
      );

      await client.query('COMMIT');
      res.json({ message: 'Bulk import successful', itemsUpdated: importedCount, batchUploadId });
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error parsing CSV for stock import:', error);
    res.status(500).json({ error: 'Failed to import stock entries' });
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
