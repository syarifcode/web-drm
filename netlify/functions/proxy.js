// netlify/functions/proxy.js
exports.handler = async (event, context) => {
    // Hanya izinkan GET request
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
    
    // Ambil endpoint dari query parameter
    const endpoint = event.queryStringParameters.endpoint;
    if (!endpoint) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Endpoint parameter required' })
        };
    }
    
    // URL target API
    const apiUrl = `https://dramabox.sansekai.my.id/api/${endpoint}`;
    
    try {
        // Fetch data dari API
        const response = await fetch(apiUrl, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'DramaBox-App/1.0'
            }
        });
        
        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Return response dengan CORS headers
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'GET, OPTIONS'
            },
            body: JSON.stringify(data)
        };
        
    } catch (error) {
        console.error('Proxy error:', error);
        
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ 
                error: 'Failed to fetch from API', 
                message: error.message 
            })
        };
    }
};