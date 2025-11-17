const sql = require('mssql');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST, // Replace with your SQL Server IP or hostname
  database: process.env.DB_DATABASE,
  options: {
    encrypt: false, // For Azure SQL Database, set true
    trustServerCertificate: true // Set true for local dev / self-signed certs
  },
  port: parseInt(process.env.DB_PORT, 10)
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('✅ Connected to SQL Server');
    return pool;
  })
  .catch(err => {
    console.error('❌ Database Connection Failed! Error: ', err);
  });

module.exports = { sql, poolPromise };
