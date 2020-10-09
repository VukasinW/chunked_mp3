const { PassThrough, Readable } = require('stream');
const ffmpeg_path = require('@ffmpeg-installer/ffmpeg')['path'];
const ffmpeg = require('fluent-ffmpeg');
const mm = require('music-metadata');

const fs = require('fs');
const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const app = express();
const server = http.createServer(app);

const ws = new WebSocket.Server({
    server: server
});

ws.on('connection', connection => {
    let chunks = [];
    connection.on('message', message => {
        const req = message.split('>');
        switch(req[0]) {
            case 'request-chunks':
                (async() => {
                    const mp3 = fs.createReadStream('./input.mp3');
                    const buffer = await streamToBuffer(mp3);
                    chunks = await splitBuffer(buffer);
                    connection.send(`request-chunks>${chunks.length}`)
                })();            
                break;
            case 'request-chunk':
                const chunk_num = req[1];
                connection.send(`request-chunk>${chunks[chunk_num || 0].toString('base64')}`);
                break;
            case 'transmission.end':
                break;
            default:
                connection.send('/e Invalid request.');
        }
    });
});

app.use('/', express.static('./public'));
// app.use('/mp3', async(req, res) => {
//     res.setHeader('Content-Type', 'audio/mp3');

//     const mp3 = fs.createReadStream('./input.mp3');
//     const buffer = await streamToBuffer(mp3);

//     const chunks = await splitBuffer(buffer);
//     // const cut = await cutMp3(buffer, 20);    

//     res.send(chunks[1]);
// });

server.listen(80, console.log('Listening at port 80.'));

async function splitBuffer(buffer) {
    return new Promise(async(resolve, reject) => {
        const length = await bufferLength(buffer);

        const chunk_number = Math.floor(length/10);
        const chunks = [];
        
        const process = async() => {
            if(chunks.length < chunk_number) {
                const chunk = await cutMp3(buffer, chunks.length*10);
                chunks.push(chunk);
                process();
            } else 
            resolve(chunks);
        }
        process();
    });
}

async function bufferLength(buffer) {
    return new Promise((resolve, reject) => {
        mm.parseBuffer(buffer)
        .then(metadata => {
            const length = parseFloat(metadata['format']['duration'])
            resolve(length);
        });
    });
}

async function cutMp3(buffer, start) {
    const stream = await bufferToStream(buffer);
    return new Promise(async(resolve, reject) => {
        const temp = new PassThrough();
        ffmpeg(stream)
        .setFfmpegPath(ffmpeg_path)
        .setStartTime(start)
        .setDuration(10)
        .outputFormat('mp3')
        .output(temp, {
            end: true
        })
        .run();
        const buffer = await streamToBuffer(temp);
        resolve(buffer);
    });
}

async function streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', chunk => chunks.push(Buffer.from(chunk, 'base64')));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
    });
}

async function bufferToStream(buffer) {
    const readable = new Readable();
    readable._read = () => void(0);
    readable.push(buffer);
    return readable;
}