require('dotenv').config();
const express = require('express');
const app = express();

const apiRoutes = require('./routes/api');
const { errorHandler } = require('./middleware/errorMiddleware');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', apiRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});