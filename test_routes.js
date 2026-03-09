const app = require('./src/app');

console.log('Registered Routes:');
app._router.stack.forEach(layer => {
    if (layer.name === 'router') {
        let routeMatch = layer.regexp.toString();
        console.log('Router middleware mounted at:', routeMatch);
        // Print inner routes
        layer.handle.stack.forEach(subLayer => {
            if (subLayer.route) {
                console.log(`  -> ${Object.keys(subLayer.route.methods).join(', ').toUpperCase()} ${subLayer.route.path}`);
            }
        });
    } else if (layer.route) {
        console.log(`Route: ${Object.keys(layer.route.methods).join(', ').toUpperCase()} ${layer.route.path}`);
    }
});
