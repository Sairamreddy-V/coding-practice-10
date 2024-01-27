//importing the modules
const express = require('express')
const app = express()
app.use(express.json())

const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const path = require('path')
const filePath = path.join(__dirname, 'covid19IndiaPortal.db')

let db

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: filePath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log(`server Running....`)
    })
  } catch (error) {
    console.log(`db.error:${error.message}`)
  }
}

initializeDbAndServer()

//logi api
app.post('/login/', async (request, response) => {
  const {username, password} = request.body
  const userQuery = `
  SELECT 
    *
  FROM 
    user
  WHERE 
    username='${username}';`
  const dbUser = await db.get(userQuery)
  if (dbUser === undefined) {
    response.status = 400
    response.send(`Invalid user`)
  } else {
    const isPasswordMach = await bcrypt.compare(password, dbUser.password)
    console.log(isPasswordMach)
    if (isPasswordMach == true) {
      const payLoad = {username: username}
      const jwtToken = jwt.sign(payLoad, 'sai_token')
      response.send({jwtToken})
    } else if (isPasswordMach == false) {
      response.satus = 400
      response.send(`Invalid password`)
    }
  }
})
const accesstokenfunction = (request, response, next) => {
  const authorHeader = request.headers['authorization']
  let jwtToken
  if (authorHeader !== undefined) {
    jwtToken = authorHeader.split(' ')[1]
  }
  if (jwtToken === undefined) {
    response.status = 401
    response.send('Invalid JWT Token')
  } else {
    jwt.verify(jwtToken, 'sai_token', async (error, user) => {
      if (error) {
        response.status = 401
        response.send('Invalid JWT Token')
      } else {
        next()
      }
    })
  }
}

//some convertion needs
const convertDbObjectToResponseObject = dbObject => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  }
}

const statsOfPeople = result => {
  let totalCases = 0
  let totalCured = 0
  let totalActive = 0
  let totalDeaths = 0
  for (let stat of result) {
    console.log(stat)
    totalCases += stat.cases
    totalCured += stat.cured
    totalActive += stat.active
    totalDeaths += stat.deaths
  }
  return {
    totalCases: totalCases,
    totalCured: totalCured,
    totalActive: totalActive,
    totalDeaths: totalDeaths,
  }
}

//getting the states
app.get('/states/', accesstokenfunction, async (request, response) => {
  const states = `
    SELECT
        *
    FROM 
       state;`
  const result = await db.all(states)
  response.send(
    result.map(eachPlayer => convertDbObjectToResponseObject(eachPlayer)),
  )
})

//getting the particular state
app.get('/states/:stateId/', accesstokenfunction, async (request, response) => {
  const {stateId} = request.params
  console.log(stateId)
  const gettingState = `
    SELECT
        *
    FROM 
       state
    WHERE 
    state_id= ${stateId};`
  console.log(stateId)
  const result = await db.get(gettingState)
  response.send({
    stateId: result.state_id,
    stateName: result.state_name,
    population: result.population,
  })
})

// posting a district
app.post('/districts/', accesstokenfunction, async (request, response) => {
  console.log(request.body)
  const {districtName, stateId, cases, cured, active, deaths} = request.body
  console.log(stateId)
  const postingState = `
  INSERT INTO district
  (district_name, state_id, cases, cured, active, deaths)
  VALUES
    ('${districtName}',
    ${stateId},
    ${cases},
    ${cured},
    ${active},
    ${deaths});`
  const result = await db.run(postingState)
  response.send(`District Successfully Added`)
})

//getting perticular districts
app.get(
  '/districts/:districtId/',
  accesstokenfunction,
  async (request, response) => {
    const {districtId} = request.params
    const gettingState = `
    SELECT
        *
    FROM 
       district
    WHERE 
    district_id= ${districtId};`
    const result = await db.get(gettingState)
    response.send({
      districtId: result.district_id,
      districtName: result.district_name,
      stateId: result.state_id,
      cases: result.cases,
      cured: result.cured,
      active: result.active,
      deaths: result.deaths,
    })
  },
)

//API-5
app.delete(
  '/districts/:districtId/',
  accesstokenfunction,
  async (request, response) => {
    const {districtId} = request.params
    const gettingState = `
    DELETE 
    FROM 
       district
    WHERE 
    district_id= ${districtId};`
    const result = await db.run(gettingState)
    response.send(`District Removed`)
  },
)

//API-6
app.put(
  '/districts/:districtId/',
  accesstokenfunction,
  async (request, response) => {
    const {districtName, stateId, cases, cured, active, deaths} = request.body
    const {districtId} = request.params
    const gettingState = `
    UPDATE 
      district
    SET(
      district_name='${districtName}',
      state_id=${stateId},
      cases=${cases},
      cured=${cured},
      active=${active},
      deaths=${deaths}
    ) 
    WHERE 
      district_id= ${districtId};`
    const result = await db.run(gettingState)
    response.send(`District Details Updated`)
  },
)
//API-7
app.get(
  '/states/:stateId/stats/',
  accesstokenfunction,
  async (request, response) => {
    const {stateId} = request.params
    console.log(stateId)
    const gettingState = `
    SELECT
        *
    FROM 
       district
    WHERE 
    state_id= ${stateId};`
    console.log(stateId)
    const result = await db.all(gettingState)
    response.send(statsOfPeople(result))
  },
)

//API-8
app.get(
  '/districts/:districtId/details/',
  accesstokenfunction,
  async (request, response) => {
    const {districtId} = request.params
    console.log(districtId)
    const getingthedistrict = `
  SELECT state_id FROM district WHERE district_id=${districtId}`
    const gettingStateId = await db.get(getingthedistrict)
    const {state_id} = gettingStateId
    const gettingState = `
  SELECT state_name FROM state WHERE state_id=${state_id}`
    const result = await db.all(gettingState)
    const {state_name} = result[0]
    console.log(state_name)
    response.send({stateName: state_name})
  },
)

module.exports = app
