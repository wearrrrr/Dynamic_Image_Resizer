const express = require('express');
const sharp = require('sharp');
const axios = require('axios');
const redis = require('redis');
const app = express();

if (process.env.REDIS_ENABLED === 'true') {
    (async () => {
        redisClient = redis.createClient();
        redis.commandOptions({ returnBuffers: true })
      
        redisClient.on("error", (error) => console.error(`Error : ${error}`));
      
        await redisClient.connect();
    })();
}
app.set('port', process.env.PORT || 3002) 

app.get('/image/:imageURL', async (req, res) => {
    try {
        const imageURL = req.params.imageURL;
        if (process.env.REDIS_ENABLED === 'true') {
            const redisValue = await redisClient.get(imageURL, function(err,reply){
                var data = reply;
                response.writeHead(200, {"Content-Type": "image/png"});
                var buff = new Buffer.from(data,'base64');
                response.end(buff);
             });
    
            if (redisValue) {
                return res.send(Buffer.from(redisValue, 'base64'))
            } else {
                const imageResponse = await axios({url: imageURL, responseType: 'arraybuffer'})
                const buffer = Buffer.from(imageResponse.data, 'binary')
                sharp(buffer)
                .resize({ width: 153, height: 218 })
                .toBuffer()
                .then(async data => {
                    if (process.env.REDIS_ENABLED === 'true') {
                        await redisClient.set(encodeURIComponent(imageURL), Buffer.from(data), {
                            EX: 5,
                            NX: true,
                        });
                    }
                  res.send(data)
                })
                .catch(err => {
                  console.error(err);
                })
            }
        } else {
            const imageResponse = await axios({url: imageURL, responseType: 'arraybuffer'})
            const buffer = Buffer.from(imageResponse.data, 'binary')
            sharp(buffer)
            .resize({ width: 153, height: 218 })
            .toBuffer()
            .then(async data => {
                if (process.env.REDIS_ENABLED === 'true') {
                    await redisClient.set(encodeURIComponent(imageURL), Buffer.from(data), {
                        EX: 5,
                        NX: true,
                    });
                }
              res.send(data)
            })
            .catch(err => {
              console.error(err);
            })
        }
    } catch(err) {
        res.status(404).send(err)
        console.log(err)
    }

})
app.get('/favicon.ico', (req, res) => res.status(204));

app.listen(app.get('port'), () => {
    console.info(`Server listen on port ${app.get('port')}`);
})