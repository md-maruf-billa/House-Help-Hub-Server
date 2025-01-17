import express from 'express';
const app = express();
import { MongoClient, ObjectId, ServerApiVersion } from 'mongodb';
import cors from 'cors';
import 'dotenv/config'
import stripe from "stripe";
const stripeInit = stripe(process.env.STRIPE_API_KEY)
const port = process.env.PORT || 7000;

//-----------MIDDLEWARE-----------------
app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER_NAME}:${process.env.DB_PASSWORD}@cluster0.fp7vkua.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        const allServicesCollection = client.db("HouseHelpHub").collection("allServices");
        const allBookingsCollection = client.db("HouseHelpHub").collection("allBookings")


        //-------------------STRIPE HARE---------------------
        app.post("/check-payment-info", async (req, res) => {
            const { price } = req.body;
            const totalPrice = parseInt(price * 100);
            const paymentIntent = await stripeInit.paymentIntents.create({
                amount: totalPrice,
                currency: 'usd',
            })
            res.send({ clientSecret: paymentIntent.client_secret })

        })
        //------------------POST DATA FROM CLIENT SIDE----------------
        app.post("/add-service", async (req, res) => {
            const userData = req.body;
            const result = await allServicesCollection.insertOne(userData);
            res.send(result)
        })

        //-------------GET BOOKING DATA FORM CLIENT SIDE AND SEND WITH DATABASE
        app.post("/post-booking", async (req, res) => {
            const data = req.body;
            const result = await allBookingsCollection.insertOne(data);
            res.send(result);
        })
        //--------------UPDATE SERVICE ------------------
        app.put("/update-service/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const data = req.body;
            const updateData = {
                $set: {
                    photoURL: data.photoURL,
                    serviceName: data.serviceName,
                    price: data.price,
                    serviceArea: data.serviceArea,
                    description: data.description
                }
            }
            const result = await allServicesCollection.updateOne(query, updateData);
            res.send(result)
        })

        //-------------------handel search service---------------
        app.get("/search/:search", async (req, res) => {
            const queryData = req.params.search;
            if (queryData == "") {
                res.send([]);
                return;
            }
            const result = await allServicesCollection.find(
                {
                    "$or": [
                        { "serviceName": { $regex: queryData, $options: "i" } },
                        { "serviceArea": { $regex: queryData, $options: "i" } },
                        { "providerName": { $regex: queryData, $options: "i" } }
                    ]

                }
            ).toArray();
            res.send(result)
        })

        //----------------UPDATE BOOKING STATUS-------------------------
        app.put("/update-booking/:id", async (req, res) => {
            const id = req.params.id;
            const status = req.body;
            const query = { _id: new ObjectId(id) }
            const updateStatus = {
                $set: {
                    status: status.currentStatus
                }
            }
            const result = await allBookingsCollection.updateOne(query, updateStatus);
            res.send(result)
        })
        //-----------DELETE A SERVICE FROM CLIENT SIDE TO DATABASE-------------
        app.delete("/delete-service", async (req, res) => {
            const id = req.query._id;
            const query = { _id: new ObjectId(id) }
            const result = await allServicesCollection.deleteOne(query);
            res.send(result)
        })

        //------------------DELETE A BOOKING---------------------
        app.delete("/delete-booking", async (req, res) => {
            const id = req.query._id;
            const query = { _id: new ObjectId(id) };
            const result = await allBookingsCollection.deleteOne(query);
            res.send(result)
        })

        //-----------Get All Services From database----------
        app.get("/all-services", async (req, res) => {
            const size = parseInt(req.query.size);
            const page = parseInt(req.query.page);
            // console.log(size, page)
            const result = await allServicesCollection.find()
                .skip(page * size)
                .limit(size)
                .toArray();
            res.send(result);
        })

        //--------------Get data by id--------------
        app.get("/service/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await allServicesCollection.findOne(query);
            res.send(result)
        })
        //--------------Get data by user email----------------
        app.get("/current-user-services", async (req, res) => {
            const query = req.query;
            const result = await allServicesCollection.find(query).toArray();
            res.send(result);
        })

        //----------------GET BOOKING DATA USING EMAIL--------------
        app.get("/booking-services", async (req, res) => {
            const customerEmail = req.query;
            const result = await allBookingsCollection.find(customerEmail).toArray();
            res.send(result);

        })

        //-------------------TEST FOR SERVER-----------
        app.get("/", async (req, res) => {
            res.send("House Help Server Is Running...!!!!")
        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error

    }
}
run().catch(console.dir);

app.listen(port, () => {
    console.log(`server is running ${port}`)
})
