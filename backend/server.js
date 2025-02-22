require("dotenv").config();
const app = require("./src/app.js");

const PORT = process.env.PORT || 5000;
app.listen(3000, (req, res) => {
  console.log("Server is running on port 3000");
});
