const sql = require('mssql');

// Load from .env
const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST, // Must match .env (DB_HOST)
  database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT || "1433"),
  options: {
    encrypt: false,                 // For local SQL Server
    trustServerCertificate: true    // Needed for Render + LAN SQL connection
  }
};

// Create SQL pool
const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log("✅ Connected to SQL Server successfully!");
    return pool;
  })
  .catch(err => {
    console.error("❌ Database Connection Failed!");
    console.error("Error: ", err);
  });

module.exports = { sql, poolPromise };
