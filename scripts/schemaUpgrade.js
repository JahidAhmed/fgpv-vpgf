const ZS = require('z-schema');
const util = require('util');
const old_schema_versions = '1.0 1.1 1.2 1.3 1.4 1.5 1.6'.split(' ');

const schema = require(process.env.PWD + '/schema.json');

let cfg = require(process.env.PWD + '/' + process.argv[2]);
let errs;

const validator = new ZS({
    noEmptyArrays: true,
    noTypeless: true,
    assumeAdditional: true,
    // forceProperties: true, // TODO we probably want this at some point but too many errors right now
    forceItems: true,
    breakOnFirstError: false
    // forceAdditional: true
});

// upstream draft04 schema probably doesn't validate under strict conditions so remove it
if (schema.hasOwnProperty('$schema')) {
    delete schema.$schema;
}

function oneToTwo(cfg) {
    const topToUi = 'theme logoUrl navBar sideMenu restrictNavigation legendIsOpen'.split(' ');
    const topToService = 'googleApiKey export search'.split(' ');
    const layerDirectCopy = 'id name url layerType metadataUrl catalogueUrl extent nameField tolerance featureInfoMimeType legendMimeType'.split(' ');
    const stateCopy = 'opacity visibility boundingBox query snapshot'.split(' ');
    const controlsCopy = 'opacity visibility boundingBox query snapshot metadata boundaryZoom refresh reload remove settings data'.split(' ');
    const entryCopy = 'id index name outfields'.split(' ');
    const baseMapDirectCopy = 'id name description typeSummary altText thumbnailUrl layers attribution zoomLevels'.split(' ');
    const namingThings = {
        '4326': 'Mercator',
        '102100': 'Web Mercator',
        '3857': 'Web Mercator',
        '3978': 'Lambert',
        '3979': 'Lambert'
    };

    let res = { ui: {}, version: "2.0" };
    if (cfg.language) {
        res.language = cfg.language;
    }
    if (cfg.services) {
        res.services = JSON.parse(JSON.stringify(cfg.services));
    }
    if (cfg.map) {
        res.map = JSON.parse(JSON.stringify(cfg.map));
    }
    if (cfg.legend) {
        res.map.legend = cfg.legend;
    }

    const copySettings = (src, dst) => {
        const stateFields = stateCopy.filter(key => src.options && src.options[key] && src.options[key].hasOwnProperty('value'));
        if (stateFields.length > 0) {
            dst.state = {};
            stateFields.forEach(key => dst.state[key] = src.options[key].value);
        }
        const controls = controlsCopy.filter(key => !src.options || !src.options.hasOwnProperty(key) || !src.options[key].hasOwnProperty('enabled') || src.options[key].enabled);
        if (controls.length !== controlsCopy.length) {
            dst.controls = controls;
        }

    };

    if (cfg.layers) {
        res.map.layers = cfg.layers.map(ol => {
            const l = {};
            layerDirectCopy.filter(key => ol.hasOwnProperty(key)).forEach(key => l[key] = ol[key]);
            copySettings(ol, l);
            if (ol.hasOwnProperty('layerEntries')) {
                l.layerEntries = ol.layerEntries.map(ole => {
                    const le = {};
                    copySettings(ole, le);
                    entryCopy.filter(key => ole.hasOwnProperty(key)).forEach(key => le[key] = ole[key]);
                    return le;
                });
            }

            return l;
        });
    }

    const extentMap = {};
    res.map.extentSets.forEach(es => {
        extentMap[es.id] = { id: es.id };
        'default full maximum'.split(' ').filter(key => es.hasOwnProperty(key)).forEach(key => {
            extentMap[es.id][key] = { xmax: es[key].xmax, xmin: es[key].xmin, ymax: es[key].ymax, ymin: es[key].ymin };
            extentMap[es.id].spatialReference = es[key].spatialReference;
        });
    });
    res.map.extentSets = Object.keys(extentMap).map(key => extentMap[key]);

    const lodMap = {};
    res.map.lodSets = res.map.lods;
    delete res.map.lods;
    res.map.lodSets.forEach(l => lodMap[l.id] = l);

    const tileSchemaMap = {};
    const tsUsed = []; // set of schemas which have a basemap under them
    Object.keys(extentMap).forEach(eid => Object.keys(lodMap).forEach(lid => {
        const ts = {};
        const tsId = eid + '#' + lid;
        ts.id = tsId;
        const wkid = extentMap[eid].spatialReference.wkid;
        if (namingThings.hasOwnProperty(String(wkid))) {
            ts.name = namingThings[String(wkid)] + ' Maps';
        } else {
            ts.name = ts.id;
        }
        ts.extentSetId = eid;
        ts.lodSetId = lid;
        tileSchemaMap[tsId] = ts;
    }));

    if (cfg.baseMaps) {
        res.map.baseMaps = cfg.baseMaps.map(obm => {
            const bm = {};
            baseMapDirectCopy.filter(key => obm.hasOwnProperty(key)).forEach(key => bm[key] = obm[key]);
            const tsId = obm.extentId + '#' + obm.lodId;
            if (!tileSchemaMap.hasOwnProperty(tsId)) {
                console.error('Tile schema was not converted');
            }
            bm.tileSchemaId = tsId;
            tsUsed.push(tsId);
            return bm;
        });
    }
    res.map.tileSchemas = tsUsed.map(key => tileSchemaMap[key]);
    // console.log(util.inspect(res.map.tileSchemas, { depth: 2}))

    topToUi.filter(key => cfg.hasOwnProperty(key)).forEach(key => res.ui[key] = cfg[key]);

    topToService.filter(key => cfg.hasOwnProperty(key)).forEach(key => res.services[key] = cfg[key]);

    // topToMap = 'legend layers'.split(' ');
    // console.log(util.inspect(res, { depth: 2}))
    return res;
}


validator.validateSchema(schema);
errs = validator.getLastErrors();
if (errs) {
    console.log('Schema is invalid');
    console.log(errs);
    return;
} else {
    console.log('Schema is valid');
}

if (old_schema_versions.indexOf(cfg.version) > -1) {
    cfg = oneToTwo(cfg);
} else {
    console.log('No schema conversion required');
}

validator.validate(cfg, schema);
console.log();
errs = validator.getLastErrors();
if (errs) {
    console.log('Converted config is invalid');
    console.log(errs);
} else {
    console.log('Converted config is valid');
}