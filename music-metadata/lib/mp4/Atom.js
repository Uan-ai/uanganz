"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Atom = void 0;
const initDebug = require("debug");
const AtomToken = require("./AtomToken");
const debug = initDebug('music-metadata:parser:MP4:Atom');
class Atom {
    constructor(header, extended, parent) {
        this.header = header;
        this.extended = extended;
        this.parent = parent;
        this.children = [];
        this.atomPath = (this.parent ? this.parent.atomPath + '.' : '') + this.header.name;
    }
    static async readAtom(tokenizer, dataHandler, parent) {
        // Parse atom header
        const offset = tokenizer.position;
        // debug(`Reading next token on offset=${offset}...`); //  buf.toString('ascii')
        const header = await tokenizer.readToken(AtomToken.Header);
        const extended = header.length === 1;
        if (extended) {
            header.length = await tokenizer.readToken(AtomToken.ExtendedSize);
        }
        const extendToEOF = ((header.length === 0) && (header.name === 'mdat') && !parent);
        if (extendToEOF) {
            header.length = tokenizer.fileInfo.size - tokenizer.position + 8;
        }
        const atomBean = new Atom(header, extended, parent);
        debug(`parse atom name=${atomBean.atomPath}, extended=${atomBean.extended}, offset=${offset}, len=${atomBean.header.length}`); //  buf.toString('ascii')
        await atomBean.readData(tokenizer, dataHandler);
        return atomBean;
    }
    getHeaderLength() {
        return this.extended ? 16 : 8;
    }
    getPayloadLength() {
        return this.header.length - this.getHeaderLength();
    }
    async readAtoms(tokenizer, dataHandler, size) {
        while (size > 0) {
            const atomBean = await Atom.readAtom(tokenizer, dataHandler, this);
            this.children.push(atomBean);
            size -= atomBean.header.length;
        }
    }
    async readData(tokenizer, dataHandler) {
        switch (this.header.name) {
            // "Container" atoms, contains nested atoms
            case 'moov': // The Movie Atom: contains other atoms
            case 'udta': // User defined atom
            case 'trak':
            case 'mdia': // Media atom
            case 'minf': // Media Information Atom
            case 'stbl': // The Sample Table Atom
            case '<id>':
            case 'ilst':
            case 'tref':
                return this.readAtoms(tokenizer, dataHandler, this.getPayloadLength());
            case 'meta': // Metadata Atom, ref: https://developer.apple.com/library/content/documentation/QuickTime/QTFF/Metadata/Metadata.html#//apple_ref/doc/uid/TP40000939-CH1-SW8
                // meta has 4 bytes of padding, ignore
                await tokenizer.ignore(4);
                return this.readAtoms(tokenizer, dataHandler, this.getPayloadLength() - 4);
            case 'mdhd': // Media header atom
            case 'mvhd': // 'movie' => 'mvhd': movie header atom; child of Movie Atom
            case 'tkhd':
            case 'stsz':
            case 'mdat':
            default:
                return dataHandler(this);
        }
    }
}
exports.Atom = Atom;
