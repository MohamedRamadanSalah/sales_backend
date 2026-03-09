(async () => {
    try {
        const r1 = await fetch('http://localhost:3000/api/favorites');
        console.log('GET /favorites:', r1.status, await r1.text());

        const r2 = await fetch('http://localhost:3000/api/orders', { method: 'POST' });
        console.log('POST /orders:', r2.status, await r2.text());
        process.exit(0);
    } catch (err) {
        console.error(err);
    }
})();
