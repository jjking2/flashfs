
// simple flash file system designed to be written to an area of a flash memory of an MCU
// meant to be used in a Nordic semiconductor's nRF52832 BLE chip.
// 2019/01/14 written

// NordicSemiconductor/nrf-intel-hex used for hex file handling
// https://github.com/NordicSemiconductor/nrf-intel-hex

// import { MemoryMap } from 'nrf-intel-hex'; // pure es6(2015)
const MemoryMap = require('nrf-intel-hex'); // nodejs

const fs = require('fs');
const path = require('path');

var startAddress = 0x40000; //  start address of the flash file system area
var directory = '.'; // directory holding input hex files

var blockAddress; // start address of each block
var count; // block count
var outMap = new MemoryMap(); // output hex content
var header = []; // filesystem header area

/**
 * search directory for .hex files
 * returns array of .hex files
 */
function getFiles(dir) {
    let files = [];
    let items = fs.readdirSync(dir);
    console.log("getFiles: " + items);
    if (!items) return files;
    for (let i=0; i<items.length; i++) {
        let stat = fs.statSync(items[i]);
        if (!stat.isFile()) continue;
        if (path.extname(items[i]) !== '.hex') continue;
        if (path.basename(items[i]) === 'flashfs.hex') continue;
        files.push(items[i]);
    }
    console.log("getFiles: " + files);
    return files;
}

/**
  * read block data from a file and write .hex data
  */
function handleFile(file) {
    console.log('handleFile: ' + file);
    let lines = fs.readFileSync(file);
    if (!lines) { console.log('handleFile: returns ' + lines); return; }
    let inMap = MemoryMap.fromHex(lines);
    for (let [addr, bytes] of inMap) {
        console.log(' offset ' + addr + ' [ ' + 
            bytes[0].toString(16) + ', ' + 
            bytes[1].toString(16) + ' ... ' + 
            bytes[bytes.length - 2].toString(16) + ', ' + 
            bytes[bytes.length - 1].toString(16) +
        ' ] len ' + bytes.length);
    }
    if (inMap.size !== 1) {
    	consolelog(file + ': a hex file should contain only one contiguous block');
    	return;
    }
   for (let [addr, bytes] of inMap) { // loop only one time
       console.log(' addr: 0x' + blockAddress.toString(16));
       outMap.set(blockAddress, bytes);
       header.push(blockAddress);
       header.push(bytes.length);
       blockAddress += bytes.length + (bytes.length % 4); // align 32bit boundary
   }
}

/**
  * prepend header area
  */
function addHeader() {
    console.log('addHeader: header = ' + header);
    console.log(' count: ' + header[0]);
    for (let i = 0; i < count; i++) {
        console.log(' addr 0x' + header[1 + i * 2].toString(16) + ' len ' + header[1 + i * 2 + 1]);
    }
    let buf = Buffer.alloc(headerSize(count));
    for (let i = 0; i < header.length; i++) {
        buf.writeUInt32LE(header[i], i * 4);
    }
    outMap.set(startAddress, buf);
}

/**
  * write flash fs .hex file
  */
function writeHex() {
    let output = outMap.asHexString();
    fs.writeFileSync('flashfs.hex', output);
}

/**
  * calculate header size.
   * header starts with block (or file) count followed by pair of address and length of each block.
   */
function headerSize(count) {
    return 4 + 8 * count;
}

function flashfs_main()
{
  files = getFiles(directory);
  if (!files) return;
  count = files.length;
  console.log(' count: ' + count);
  header.push(count); // first header field is block count
  blockAddress = startAddress + headerSize(count); // address of the first block
    for (let f of files) {
        handleFile(f);
    }
    addHeader();
    writeHex();
}

console.log('flashfs - flash file system builder');
console.log(' usage: node flashfs [start_address_hex [directory_of_hex_files]]');
if (process.argv > 3) directory = process.argv[3];
if (process.argv > 2) startAddress = parseInt(process.argv[2], 16);
console.log(' start address = 0x' + startAddress.toString(16));
console.log(' directory = ' + directory);
flashfs_main();
