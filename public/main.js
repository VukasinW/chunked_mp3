const ws = new WebSocket('ws://localhost');
const buffer = [];
let chunk_number = 0;

ws.onopen = () => {
    ws.send('request-chunks>*');
    ws.onmessage = e => {
        const req = e['data'].split('>');
        switch(req[0]) {
            case 'request-chunks':
                chunk_number = parseInt(req[1]);
                ws.send(`request-chunk>0`);
                break;
            case 'request-chunk':
                if(buffer.length < chunk_number)
                    buffer.push(req[1])
                //playChunk(req[1]);
                break;
        }
    }
}

function chunkLoader() {
    if(i < chunk_number) {
        ws.send(`request-chunk>${buffer.length}`);
        i++;
    }
}

function getChunk() {
    ws.send(`request-chunk>${i}`);
    i++;
}

function playChunk(chunk) {
    const audio = new Audio();
    audio.src = `data:audio/mpeg;base64,${chunk}`;
    audio.play();
    if(i < chunk_number) {
    }
    audio.onended = () => getChunk();
}