// imagefilter: https://snippets.cacher.io/snippet/c3df237136848a2cbc45

const express = require('express');
const mongodb = require('mongodb');
const router = express.Router();
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const projectsDB = require('../../configuration/dbConfig'); // db-config
const path = require('path');

const MongoClient = require("mongodb").MongoClient;
const mongoClient = new MongoClient(projectsDB.url);

// kaikki lomakkeesta tulevat tiedostot menevät imageFiltterin läpi, joka tallentaa hyväksyy vain kuvatiedostoja
function imageFilter(req, file, callback) {
  if (path.extname(file.originalname).toLowerCase().match(/\.(jpeg|jpg|bmp|png|gif)$/))
    callback(null, true)
  else
    callback(null, false)
}

// defining gridfsstorage, which will store files DIRECTLY to mongodb
const storage = new GridFsStorage({
  url: projectsDB.url + projectsDB.database,
  options: { useNewUrlParser: true, useUnifiedTopology: true},
  file: (req, file) => {
    // 'palautetaan' tallennussijainti jne // bucketName = The GridFs collection to store the file (default: fs)
    return {
      bucketName: projectsDB.collection,
      filename: `${file.originalname}`
    }
  }
});

// get all projects
router.get('/projects', async (req, res) => {
  //const projects = await loadProjectCollection(projectsDB.collection);
  await mongoClient.connect();
  const projects = mongoClient.db(projectsDB.database).collection(projectsDB.collection);
  res.send(await projects.find({}).toArray()); // find all
});

// add projects
router.post('/projects', multer({
      fileFilter: imageFilter, storage: storage})
        .fields([
          {name: "file", maxCount: 1},
          {name: "files", maxCount: 10}]),
    async (req, res) => {
      try{
        const picturesID = [];
        let thumbnailID = null;

        if(Object.keys(req.files).length > 0) {
          console.log('tallennetaan kuvallinen projekti');
          console.log('Object.keys(req.files).length = ' + Object.keys(req.files).length)

          if(Object.keys(req.files).length === 1){
            if(req.files['file'] === undefined){
              req.files['files'].forEach(p => {
                picturesID.push(p.id);
              });
              await sendBodyToMongo(req.body, null, picturesID);
              res.status(201).send();
            }else{
              thumbnailID = req.files['file'][0].id;
              await sendBodyToMongo(req.body, thumbnailID, picturesID);
              res.status(201).send();
            }
          } else {
            req.files['files'].forEach(p => {
              picturesID.push(p.id);
            });
            thumbnailID = req.files['file'][0].id;
            await sendBodyToMongo(req.body, thumbnailID, picturesID);
            res.status(201).send();
          }
        } else {
          console.log('tallennetaan kuvaton projekti');

          await sendBodyToMongo(req.body, thumbnailID, picturesID);
          res.status(201).send();
        }

      }catch(e){
        console.log('e');
        return res.status(500).send({
          message: 'Virhe add projects',
          error: e.message
        });
      }
    });

// edit projects
router.put('/projects/:id', multer({
      fileFilter: imageFilter, storage: storage})
        .fields([
          {name: "file", maxCount: 1},
          {name: "files", maxCount: 10}]),
    async (req, res) => {
      try{
        await mongoClient.connect();
        const projects = mongoClient.db(projectsDB.database).collection(projectsDB.collection);
        const pictures = mongoClient.db(projectsDB.database).collection(projectsDB.collection + '.files');
        const editable = await projects.findOne({_id: new mongodb.ObjectID(req.params.id)});

        // poistetaan thumbnail
        if(editable.thumb_id != null){
          await pictures.deleteOne({_id: new mongodb.ObjectID(editable.thumb_id)});
        }

        //poistetaan kuvia
        const deletablePics = editable.pics_id;
        if(deletablePics.length > 0){
          for(let p of deletablePics){
            await pictures.deleteOne({_id: p});
          }
        }
// tähän että onko kuvia vai ei
        const newPicturesID = [];
        let newThumbID = null;
        if(Object.keys(req.files).length > 0) {
          if(Object.keys(req.files).length === 1){
            if(req.files['file'] === undefined){
              req.files['files'].forEach(p => {
                newPicturesID.push(p.id);
              });
            } else {
              newThumbID = req.files['file'][0].id;
            }
          } else {
            newThumbID = req.files['file'][0].id;
            req.files['files'].forEach(p => {
              newPicturesID.push(p.id);
            });
          }
        }
        await projects.updateOne(editable,
            {
              $set: {title: req.body.title,
                descr: req.body.descr,
                repo: req.body.repo,
                thumb_id: newThumbID,
                pics_id: newPicturesID},
              $currentDate: {lastModified: true}
            });
        res.status(201).send();
      } catch (e){
        console.log('put error');
        console.log(e.message);
      }

    });

// delete projects
router.delete('/projects/:id', async (req, res) => {
// mitä jos ei ole kuvia/kuvaa/jjnejne
  try {
    await mongoClient.connect();
    const projectsCollection = mongoClient.db(projectsDB.database).collection(projectsDB.collection);
    const deletable = await projectsCollection.findOne(
        {_id: new mongodb.ObjectID(req.params.id)});

    const thumbID = deletable.thumb_id;
    const picsID = deletable.pics_id;

    const picCollection = await loadProjectCollection(projectsDB.collection + '.files');
    if(thumbID != null)
      await picCollection.deleteOne({_id: thumbID});

    if(picsID.length > 0){
      for(let p of picsID){
        await picCollection.deleteOne({_id: p});
      }
    }

    await projectsCollection.deleteOne({_id: new mongodb.ObjectID(req.params.id)});
    res.status(200).send();
  } catch (e){
    console.log('virhe');
    console.log(e.message);
  }
});

// get a project by id
router.get('/projects/:id', async(req, res) => {
  try{
    await mongoClient.connect();
    const projectCollection = mongoClient.db(projectsDB.database).collection(projectsDB.collection);
    const project = await projectCollection.findOne({_id: new mongodb.ObjectID(req.params.id)});
    return res.status(200).send(project);
  }catch(e){
    return res.status(500).send({
      message: 'Virhe 123',
      error: e.message
    });
  }
});

// get project pictures
router.get('/files', async (req, res) => {
  try{
    await mongoClient.connect();
    const pictureCollection = mongoClient.db(projectsDB.database).collection(projectsDB.collection + '.files');
    const pictures = pictureCollection.find({});

    if((await pictures.count()) === 0)
      return res.status(5000).send({
        message: 'Kuvia ei löytynyt!'
      });

    const picInfos = [];
    await pictures.forEach((pic) => {
      picInfos.push({
        _id: pic._id,
        name: pic.filename,
        url: 'http://localhost:5000/api/files/' + pic._id // HUOM KOVAKOODAUS
      });
    });
    return res.status(200).send(picInfos);

  }catch(e){
    return res.status(500).send({
      message: 'Virhe 123',
      error: e.message
    });
  }
});

// get picture details by id
router.get('/files/:id/details', async (req, res) => {
  try{
    await mongoClient.connect();
    const picturesCollection = mongoClient.db(projectsDB.database).collection(projectsDB.collection + '.files');
    const pictureWithDetails = await picturesCollection.findOne({_id: new mongodb.ObjectID(req.params.id)});
    pictureWithDetails.url = 'http://localhost:5000/api/files/' + pictureWithDetails._id; // HUOM KOVAKOODAUS

    return res.status(200).send(pictureWithDetails);
  }catch(e){
    return res.status(500).send({
      message: 'Virhe 123',
      error: e.message
    });
  }
});


// watch project pictures (download & zoom in)
router.get('/files/:id', async (req, res) => {
  try{  // ei kutsuta loadProjectsCollectionin avulla perinteisesti, sillä halutaan spesifimmän määrityksen

    await mongoClient.connect();
    const db = mongoClient.db(projectsDB.database);
    const bucket = new mongodb.GridFSBucket(db, {
      bucketName: projectsDB.collection
    });

    const picID = new mongodb.ObjectID(req.params.id);

    const dwnldStream = bucket.openDownloadStream(picID);

    dwnldStream.on('data', (data) => {
      return res.status(200).write(data);
    });

    dwnldStream.on('error', (e) => {
      return res.status(404).send({
        message: 'Kuvaa ei voitu ladata'
      });
    });

    dwnldStream.on('end', () => {
      return res.end();
    });
  }catch(e){
    return res.status(500).send({
      message: 'Virhe',
      error: e.message
    });
  }
});

//funktio, joka lähettää rew.body:n osia mongodb:hen. tämän avulla samaa asiaa ei tarvitse kirjoittaa monta kertaa koodissa
async function sendBodyToMongo(body, thumbnailID, picturesID){
  const projects = await loadProjectCollection(projectsDB.collection);
  await projects.insertOne({
    title: body.title,
    descr: body.descr,
    repo: body.repo,
    thumb_id: thumbnailID,
    pics_id: picturesID
  });
}

// palauttaa meidän mongodb:n collectionin (vastaa sql:n tablea)
async function loadProjectCollection(coll){
  const client = await mongodb.MongoClient.connect
  (projectsDB.url, {
    useNewUrlParser: true
  });
  return client.db(projectsDB.database).collection(coll);
}

module.exports = router;
