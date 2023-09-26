const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')
const {Schema} = mongoose

mongoose.connect(process.env.MONGO_URI)
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error: "));
db.once("open", function () {
  console.log("CONNECTED TO MONGO DB");
});

app.use(express.urlencoded({extended: true}))

const UserSchema = new Schema({
  username: {type: String, required: true}
})
const User = mongoose.model('User', UserSchema)

const ExerciseSchema = new Schema({
  user_id: {type: String, required: true},
  description: String,
  duration: Number,
  date: Date
})
const Exercise = mongoose.model('Exercise', ExerciseSchema)


app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async (req, res) => {
  const uname = req.body.username
  const userObj = new User({username: uname})
    try {
      const user = await userObj.save()
      console.log('SAVED USER', user)
    } catch (err) {
      console.log('COULD NOT SAVE USER!!')
    }
    const userId = await User.findOne({username: uname})
    res.json({username: uname, _id: userId._id})
  
  
})

app.post('/api/users/:_id/exercises', async (req, res) => {
  const id = req.params._id
  const {description, duration, date} = req.body;
  try {
    const user = await User.findById(id)
    if (!user) {
      console.log('COULD NOT FIND USER')
      res.send('ERROR: ID does not exists')
    } else {
      const exerObj = new Exercise({
        user_id: user._id,
        description: description,
        duration: duration,
        date: date ? new Date(date) : new Date()
      })
      const exer = await exerObj.save()
      console.log('SAVED EXERCISE', exer)
      res.json({
        _id: user._id,
        username: user.username,
        description: exer.description,
        duration: exer.duration,
        date: new Date(exer.date).toDateString()
      })
    }
    
  } catch (err) {
    console.log(err)
    res.send('Error saving exercise... Please try again!')
  }
})

app.get('/api/users/', async (req, res) => {
  const users = await User.find({}).select("id username")
  res.send(users)
})

app.get('/api/users/:_id/logs', async (req, res) => {
  const id = req.params._id
  const user = await User.findById(id)
  console.log(user)
  const {from, to, limit} = req.query
  if (!user) {
    res.send('COULD NOT FIND USER ID!!')
    return
  }
  const dateObj = {}
  if (from) {
    dateObj["$gte"] = new Date(from)
  }
  if (to) {
    dateObj['$lte'] = new Date(to)
  }
  let filter = {
    user_id: id
  }
  if (from || to) {
    filter.date = dateObj
  }
  const exercises = await Exercise.find(filter).limit(+limit ?? 100)
  const log = exercises.map(e => ({
    description: e.description,
    duration: e.duration,
    date: e.date.toDateString()
  }))

  res.json({
    username: user.username,
    count: exercises.length,
    _id: user._id,
    log
  })
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
