const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const cors = require("cors");
const port = process.env.PORT || 5000;
require("dotenv").config();

// middle wire
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qhvkztn.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const classCollection = client.db("summerdb").collection("classes");
    const instructorCollection = client
      .db("summerdb")
      .collection("instructors");
    const classCartCollection = client.db("summerdb").collection("classCart");

    // first get route for popular classes . called from popular class component
    app.get("/classes", async (req, res) => {
      const query = {};
      const options = {
        sort: { students: -1 },
      };
      const result = await classCollection.find(query, options).toArray();
      res.send(result);
    });

    // instructors get routes to get all instructors  data in AllInsTructors component
    app.get("/instructors", async (req, res) => {
      const query = {};
      const result = await instructorCollection.find(query).toArray();
      res.send(result);
    });

    // select class  cart er Route for saving(posting) selected course in classCart collection
    app.post("/carts", async (req, res) => {
      const item = req.body;
      const result = await classCartCollection.insertOne(item);
      res.send(result);
    });
    // get the selected course from classCart collection for individual student
    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      const query = { email: email };
      const result = await classCartCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classCartCollection.deleteOne(query);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("summer camp in running ");
});

app.listen(port, () => {
  console.log(`summer camp is running on port ${port} `);
});
