const express = require("express");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
const xlsx = require("xlsx");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const moment = require("moment");
moment.locale("tr");
var app = express();
app.use(express.static("./"));
app.use(fileUpload());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(
  cors({
    // origin: `*`, //react's address
    origin: true,
    credentials: true,
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  })
);

const checkAuth = (req, res, next) => {
  const auth = { login: process.env.NAME, password: process.env.PASSWORD };
  const b64auth = (req.headers.authorization || "").split(" ")[1] || "";
  const [login, password] = Buffer.from(b64auth, "base64")
    .toString()
    .split(":");
  if (login && password && login === auth.login && password === auth.password)
    return next();

  res.set("WWW-Authenticate", 'Basic realm="401"');
  res.status(401).send("Authentication required.");
};

app.post("/excell2Json", checkAuth, async (req, res) => {
  if (
    !req.files ||
    Object.keys(req.files).length === 0 ||
    req.files.dosya1.length > 1
  ) {
    return res.status(400).send("No files were uploaded.");
  }
  try {
    const { name, size } = req.files.dosya1;
    if (size > 512000) return res.send({ msg: "max 5 mb" }); //7019600
    let checkType = name.split(".").pop();
    console.log(checkType, "checkType");
    if (checkType !== "xlsx")
      return res.send({ msg: "error file type only accept xlsx" });
    try {
      const workbook = xlsx.read(req.files.dosya1.data, { type: "buffer" });
      const sheet_name_list = workbook.SheetNames;
      const parseJson = xlsx.utils.sheet_to_json(
        workbook.Sheets[sheet_name_list[0]]
      );
      res.send(parseJson);
    } catch (error) {
      console.log("error", error);
      res.send({ error: "xlsx type error" });
    }
  } catch (error) {
    res.send({ msg: error });
  }
});
app.post("/json2excell", checkAuth, (req, res) => {
  if (
    !req.files ||
    Object.keys(req.files).length === 0 ||
    req.files.dosya1.length > 1
  ) {
    return res.status(400).send("No files were uploaded.");
  }
  const jsonFile = req.files.dosya1;
  const decodedJsonObject = Buffer.from(jsonFile.data, "base64").toString();
  console.log("--decodedJsonObject-->", JSON.parse(decodedJsonObject));
  const getTime = Date.now();
  var worksheet = xlsx.utils.json_to_sheet(JSON.parse(decodedJsonObject));
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "SheetName1");
  xlsx.writeFile(workbook, `${getTime}.xlsx`);
  res.send({
    name: getTime,
    status: true,
    url: process.env.URL + getTime + ".xlsx",
  });
});

app.listen(5000, () => {
  console.log("server running 5000 port");
});
