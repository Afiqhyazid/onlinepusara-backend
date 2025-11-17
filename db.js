const sql = require('mssql');

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST, // You may need to replace 'localhost' with your actual SQL Server IP address
  database: process.env.DB_DATABASE,
  options: {
    encrypt: false, // For Azure SQL Database, true
    trustServerCertificate: true // Change to true for local dev / self-signed certs
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



















