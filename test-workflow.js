const http = require('http');

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 3333,
      path: '/api' + path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test',
        'x-role': 'ADMIN'
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data || '{}') });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  try {
    console.log('--- STARTING TEST ---');
    // 1. Get a free table
    let res = await request('GET', '/tables');
    const table = res.data.find(t => t.status === 'free');
    if (!table) { console.log('No free table found'); return; }
    console.log('Found free table:', table.table_number);

    // 2. Create order
    console.log('\n--- Creating Order ---');
    res = await request('POST', `/tables/${table.table_id}/orders`, {
      items: [{ id: 1, quantity: 2, gstRate: 5 }]
    });
    console.log('Order created status:', res.status, res.data.order_id ? 'OK' : 'FAIL', res.data);
    const orderId = res.data.order_id;

    if (!orderId) return;

    // 3. Send to kitchen
    console.log('\n--- Sending to Kitchen ---');
    res = await request('POST', `/orders/${orderId}/send-to-kitchen`);
    console.log('Sent to kitchen status:', res.status, res.data.message);
    const skot = res.data.sectionKots[0];
    const skotId = skot.section_kot_id;

    // 4. Mark KOT Acknowledged
    console.log('\n--- Mark KOT Acknowledged ---');
    res = await request('POST', `/kots/section-kots/${skotId}/status`, { status: 'acknowledged' });
    console.log('Ack status:', res.status, res.data.status);

    // 5. Generate Bill
    console.log('\n--- Generating Bill ---');
    res = await request('POST', '/bills', {
      cashier_id: 1,
      table_id: table.table_id,
      order_ids: [orderId],
      items: [{ itemId: 1, quantity: 2 }]
    });
    console.log('Bill generation status:', res.status, res.data.bill ? 'OK' : 'FAIL');
    const billId = res.data.bill.id;

    // 6. Pay Bill
    console.log('\n--- Paying Bill ---');
    res = await request('PATCH', `/bills/${billId}/payment`, { payment_status: 'paid' });
    console.log('Bill payment status:', res.status, res.data.message);

    // 7. Check Table Status
    res = await request('GET', `/tables/${table.table_id}`);
    console.log('\nTable status before KOT served:', res.data.status);

    // 8. Mark KOT Completed
    console.log('\n--- Mark KOT Ready ---');
    res = await request('POST', `/kots/section-kots/${skotId}/status`, { status: 'completed' });
    console.log('Ready status:', res.status, res.data.status);

    // 9. Mark KOT Served
    console.log('\n--- Mark KOT Served ---');
    res = await request('POST', `/kots/section-kots/${skotId}/status`, { status: 'served' });
    console.log('Served status:', res.status, res.data.status);

    // 10. Check Table Status
    res = await request('GET', `/tables/${table.table_id}`);
    console.log('\nTable status after KOT served:', res.data.status);

  } catch(e) {
    console.error(e);
  }
}
run();
