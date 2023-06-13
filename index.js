const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const jwt = require("jsonwebtoken");
const cors = require("cors");
const stripe = require("stripe")(
  "sk_test_51NID9aIDiJHAvHqU6XHTMdivOfS556riOseGzMD9dHOrNLqrN4q4tf1as2wLV0tos08zY8QacqQhhJTLApgPJ4Xv00mcOtwRgJ"
);

const port = process.env.PORT || 5000;
require("dotenv").config();

// middle wire
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

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

    const usersCollection = client.db("summerdb").collection("users");
    const classCollection = client.db("summerdb").collection("classes");
    const instructorCollection = client
      .db("summerdb")
      .collection("instructors");
    const classCartCollection = client.db("summerdb").collection("classCart");
    const paymentCollection = client.db("summerdb").collection("payments");

    // use verifyJWT before using admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "admin") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };
    // verifyJWT before using verifyInstructor
    const verifyInstructor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "instructor") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };
    const verifyStudent = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user?.role !== "student") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };

    // JWT related issue
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET_KEY, { expiresIn: "1h" });
      res.send({ token });
    });

    // all users collection
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      console.log("existing user", existingUser);
      if (existingUser) {
        return res.send({ message: "user already exists" });
      }
      const insertResult = await usersCollection.insertOne(user);
      res.send(insertResult);
    });

    // get users to show at admin dashboard (manage users)
    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const insertResult = await usersCollection.find().toArray();
      res.send(insertResult);
    });

    // check user whether it is a admin
    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        res.send({ admin: false });
      } else {
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        const insertResult = { admin: user?.role === "admin" };
        res.send(insertResult);
      }
    });
    // check user whether it is a instructor

    app.get("/users/instructor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        res.send({ instructor: false });
      } else {
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        const insertResult = { instructor: user?.role === "instructor" };
        res.send(insertResult);
      }
    });
    // check user whether it is a student

    app.get("/users/student/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        res.send({ student: false });
      } else {
        const query = { email: email };
        const user = await usersCollection.findOne(query);
        const insertResult = { student: user?.role === "student" };
        res.send(insertResult);
      }
    });

    // update users status (make admin )

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const insertResult = await usersCollection.updateOne(filter, updateDoc);
      res.send(insertResult);
    });

    // update user status( make instructors)

    app.patch("/users/instructor/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "instructor",
        },
      };
      const insertResult = await usersCollection.updateOne(filter, updateDoc);
      res.send(insertResult);
    });

    // post classes data from add a class component
    app.post("/classes", verifyJWT, verifyInstructor, async (req, res) => {
      const classInfo = req.body;
      const insertResult = await classCollection.insertOne(classInfo);
      res.send(insertResult);
    });
    //(Home Page get for popular classes) first all classes based on  . called from popular class component
    app.get("/classes", async (req, res) => {
      const query = {};
      const options = {
        sort: { availableSeats: -1 },
      };
      const insertResult = await classCollection.find(query, options).toArray();
      res.send(insertResult);
    });

    app.get("/classes/admin", verifyJWT, verifyAdmin, async (req, res) => {
      const query = {};

      const insertResult = await classCollection.find(query).toArray();
      res.send(insertResult);
    });

    // get classes based on specific instructor email
    app.get(
      "/instructorClasses",
      verifyJWT,
      verifyInstructor,
      async (req, res) => {
        const email = req.query.email;

        console.log(email);
        if (!email) {
          res.send([]);
        }
        const query = { email: email };
        const insertResult = await classCollection.find(query).toArray();
        res.send(insertResult);
      }
    );

    // (admin dashBoard) update class status(approved)
    app.patch("/classes/approve/:id", async (req, res) => {
      const id = req.params.id;

      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "approved",
        },
      };
      const insertResult = await classCollection.updateOne(filter, updateDoc);
      res.send(insertResult);
    });
    //(admin dashboard) update class status  denied
    app.patch("/classes/deny/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: "denied",
        },
      };
      const insertResult = await classCollection.updateOne(filter, updateDoc);
      res.send(insertResult);
    });

    // all instructors get  routes for AllInsTructors component(no JWT TOKEN verify)
    app.get("/instructors", async (req, res) => {
      const query = {};
      const insertResult = await instructorCollection.find(query).toArray();
      res.send(insertResult);
    });

    // select class button  Route for saving(posting) selected course in classCart collection
    app.post("/carts", verifyJWT, verifyStudent, async (req, res) => {
      const item = req.body;
      const id = item.classId;
      const query = { classId: id };
      const existingClass = await classCartCollection.findOne(query);
      if (existingClass) {
        return res.send({ message: "you have already selected the class" });
      }
      const insertResult = await classCartCollection.insertOne(item);
      res.send(insertResult);
    });

    // get the selected course from classCart collection for individual student
    app.get("/carts", verifyJWT, verifyStudent, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res
          .status(401)
          .send({ error: true, message: "unauthorized access" });
      }
      const query = { email: email };
      const insertResult = await classCartCollection.find(query).toArray();
      res.send(insertResult);
    });

    app.delete("/carts/:id", verifyJWT, verifyStudent, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const insertResult = await classCartCollection.deleteOne(query);
      res.send(insertResult);
    });

    // payment method intent
    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const { price } = req.body;
      // console.log(price)
      // const priceNumber = Number(price);
      // if (isNaN(priceNumber)) {
      //   return res.status(400).json({ error: 'Invalid price value' });
      // }
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    // payment api

    app.post("/payments", verifyJWT, async (req, res) => {
      const payment = req.body;
      const insertResult = await paymentCollection.insertOne(payment);
     
      const classId = payment.classId;
      const query = { classId: classId };
      const deleteResult = await classCartCollection.deleteMany(query);

      res.send({insertResult , deleteResult});
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
