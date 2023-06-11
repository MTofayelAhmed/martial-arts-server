const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const jwt = require('jsonwebtoken');
const cors = require("cors");
const port = process.env.PORT || 5000;
require("dotenv").config();

// middle wire
app.use(cors());
app.use(express.json());



const verifyJWT = (req, res, next)=>{
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error: true, message: "unauthorized access"})
  }
  const token = authorization.split(' ')[1]
  jwt.verify(token, process.env.SECRET_KEY, (err, decoded)=>{
    if(err){
      return res.status(401).send({error: true, message: "unauthorized access"})
    }
    req.decoded= decoded;
    next()
  })
} 

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

// JWT related issue
app.post('/jwt', (req, res)=> {
  const user = req.body;
  const token= jwt.sign(user, process.env.SECRET_KEY, { expiresIn: '1h' })
  res.send({token})


})



    // all users collection
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await usersCollection.findOne(query);
      console.log("existing user", existingUser);
      if (existingUser) {
        return res.send({ message: "user already exists" });
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });


// get users to show at admin dashboard (manage users)
    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // check user whether it is a admin
    app.get('/users/admin/:email', verifyJWT,  async(req, res)=> {
      const email = req.params.email;
      if(req.decoded.email !== email){
        res.send({admin: false})
      }
      else{
        const query= {email: email}
      const user = await usersCollection.findOne(query)
      const result = { admin: user?.role === "admin"}
      res.send(result)

      }
      
    })
    // check user whether it is a instructor

    app.get('/users/instructor/:email', verifyJWT,  async(req, res)=> {
      const email = req.params.email;
      if(req.decoded.email !== email){
        res.send({instructor: false})
      }
      else{
        const query= {email: email}
        const user = await usersCollection.findOne(query)
        const result = { instructor: user?.role === "instructor"}
        res.send(result)
      }
    
    })

    app.get('/users/student/:email', verifyJWT,  async(req, res)=> {
      const email = req.params.email;
      if(req.decoded.email !== email){
        res.send({student: false})
      }
      else{
        const query= {email: email}
        const user = await usersCollection.findOne(query)
        const result = { student: user?.role === "student"}
        res.send(result)
      }
     
    })




    // update users status (make admin )

    app.patch('/users/admin/:id', async(req, res)=> {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const updateDoc = {
        $set: {
          role: "admin", 
        }
      
      }
      const result = await usersCollection.updateOne(filter, updateDoc)
      res.send(result)
    })


    // update user status( make instructors)

    app.patch('/users/instructor/:id', async(req, res)=> {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const updateDoc = {
        $set: {
          role: "instructor", 
        }
      
      }
      const result = await usersCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

// post classes data from add a class component 
    app.post("/classes", async (req, res) => {
      const classInfo=  req.body;
      const result = await classCollection.insertOne(classInfo)
      res.send(result)

    });
    //(Home Page get for popular classes) first all classes based on  . called from popular class component
    app.get("/classes", async (req, res) => {
      const query = {};
      const options = {
        sort: { availableSeats: -1 },
      };
      const result = await classCollection.find(query, options).toArray();
      res.send(result);
    });



    // get classes based on specific instructor email
    app.get('/instructorClasses', async(req, res)=> {
      const email= req.query.email;

    console.log(email)
      if (!email) {
        res.send([]);
      }
      const query = {email: email}
      const result = await classCollection.find(query).toArray()
      res.send(result)
    })

// (admin dashBoard) update class status(approved)
app.patch('/classes/approve/:id', async(req, res)=> {
  const id = req.params.id;

  const filter = {_id: new ObjectId(id)}
  const updateDoc = {
    $set: {
      status:"approved"
    }}
  const result = await classCollection.updateOne(filter, updateDoc)
  res.send(result)

})
//(admin dashboard) update class status  denied
app.patch('/classes/deny/:id', async(req, res)=> {
  const id = req.params.id;
  const filter = {_id: new ObjectId(id)}
  const updateDoc = {
    $set: {
      status: "denied", 
    }}
  const result = await classCollection.updateOne(filter, updateDoc)
  res.send(result)

})






    // all instructors get  routes for AllInsTructors component(no JWT TOKEN verify)
    app.get("/instructors", async (req, res) => {
      const query = {};
      const result = await instructorCollection.find(query).toArray();
      res.send(result);
    });




    // select class button  Route for saving(posting) selected course in classCart collection
    app.post("/carts", async (req, res) => {
      const item = req.body;
      const id= item.classId;
      const query= {classId: id}
      const existingClass = await classCartCollection.findOne(query)
      if(existingClass){
        return res.send({message: "you have already selected the class"})
      }
      const result = await classCartCollection.insertOne(item);
      res.send(result);
    });

    // get the selected course from classCart collection for individual student
    app.get("/carts", verifyJWT,   async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }

const decodedEmail = req.decoded.email;
if(email !== decodedEmail){
  return res.status(401).send({error: true, message: "unauthorized access"})
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
