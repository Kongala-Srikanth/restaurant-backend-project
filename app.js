const express = require('express')
const mongoose = require('mongoose')
const {ObjectId, MongoClient} = require('mongodb')
const cors = require('cors')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const {v4:uuidv4} = require('uuid')
const app = express()

app.use(express.json())
app.use(cors())

let client 
const initializeDBAndServer = async () => {
    const dbPassword = 'srikanth%40123'
    const uri = `mongodb+srv://srikanth:${dbPassword}@cluster0.3a9kb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
    client = new MongoClient(uri)

    try{
        await client.connect()
        console.log('Connect is succes to mongodb')

        app.listen(3000, () => {
            console.log('server is running on port : 3000')
        })
    }
    catch(e){
        console.log(`Error connecting to mongodb: ${e.message}`)
        process.exit(1)
    }
    
}

initializeDBAndServer()


const middleWare = (req, res, next) => {
    let jwtToken
    const header = req.headers['authorization']

    if (header != undefined){
        jwtToken = header.split(' ')[1]
    }

    if (jwtToken === undefined){
        res.status(401)
        res.send({errorMsg: 'Invalid jwt token'})
    }

    else{
        jwt.verify(jwtToken, 'MY_SECRET_TOKEN', async(error, payload) => {
            if (error){
                res.status(401)
                res.send({errorMsg: error})
            }else{
                req.userId = payload.userId
                next()
            }
        })
    }
}



app.post('/register', async (request, response) => {
    const {name, email, password} = request.body
    const table = client.db('foodData').collection('users')
    
    const userTableInDB = await table.find(
        {email}
    ).toArray()

    if (userTableInDB.length === 0){
        const encryptPassword = await bcrypt.hash(password, 20)

        if (name !== undefined){
        await table.insertOne(
            {
                name: name,
                email: email,
                password: encryptPassword
            }
        )
    
    response.status(201)
    response.send('User Registered is Success')
    } else {
        response.status(400)
        response.send({errorMsg: 'Please enter correct user details'})
    }}else{
        response.status(400)
        response.send({errorMsg: 'User already exists'})
    }

})



app.post('/login', async(request, response) => {
    const {email, password} = request.body
    const table = client.db('foodData').collection('users')
    
    const checkUserInDB = await table.find({email}).toArray()
    
    if(checkUserInDB.length === 1){
        const verifyPassword = await bcrypt.compare(password, checkUserInDB[0].password)
        if(verifyPassword){
            const token = jwt.sign({userId: checkUserInDB[0]._id }, 'MY_SECRET_TOKEN')
            response.status(201)
            response.send({jwtToken: token})
        }
        else{
            response.status(401)
            response.send({errorMsg: 'Incorrect password'})
        }

    }
    else{
        response.status(401)
        response.send({errorMsg: "User does not exists"})
    }

})

app.get('/profile', middleWare, async(request, response) => {
    const getUserId = new ObjectId(request.userId)
    const table = client.db('foodData').collection('users')

    const userDetails = await table.findOne({_id: getUserId})
    if(userDetails !== undefined){
        response.status(201)
        response.send({userDetails: userDetails})
    }
    else{
        response.status(401)
        response.send({errorMsg: "User details not found"})
    }
})

app.put('/profile', middleWare, async(request, response) => {
    const {name, email, phone, addresses} = request.body

    try{
        const findUserId = new ObjectId(request.userId)
        const table = client.db('onlineFoodOrder').collection('users')
        const findUser = await table.findOne({
            _id: findUserId
        })

        const updateUserDetails = await table.updateOne(
            { _id: findUserId },
            { 
                $set: {
                    name: name || findUser.name,       
                    email: email || findUser.email,    
                    phone: phone || findUser.phone,    
                    addresses: addresses || findUser.addresses
                }
            }
        );

        const getData = await table.findOne({
            _id: findUserId
        })

        response.status(201)
        response.send(JSON.stringify("User details updated successfully"))
    }
    catch(e){
        response.status(401)
        response.send({errorMsg: e})
    }    

})

app.post('/restaurants', async(request, response) => {
    const {name, location, password} = request.body

    const table = client.db('foodData').collection('restaurants')

    const checkRestaurantInDB = await table.find({name}).toArray()

    const encryptPassword = await bcrypt.hash(password, 10)

    if(checkRestaurantInDB.length === 0){
        if(name !== undefined && location !== undefined){
            await table.insertOne({
                name: name,
                location: location,
                password: encryptPassword
            })

            response.status(201)
            response.send("Restaurant account created successfully")
        }
        else{
            response.status(401)
            response.send({errorMsg: "Please enter correct details"})
        }
    }
    else{
        response.status(401)
        response.send({errorMsg: "Restaurant already exists"})
    }
})

app.get('/restaurants', middleWare, async(request, response) => {
    
    const restaurantId = new ObjectId(request.userId)
    const table = client.db('onlineFoodOrder').collection('restaurants')

    const getRestaurantData = await table.findOne({_id: restaurantId})

    console.log(getRestaurantData)
})
