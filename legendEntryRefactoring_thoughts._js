class LegendBlock {
    constructor(controlObject, id) {

        this._id = id;

        this._controlObject = controlObject;
    }

    _id;
    _controlObject;

    get id() {
        return this._id;
    }
}

class LegendInfo extends LegendBlock {
}

class LegendEntry extends LegendBlock {

    _isSelected = false;

    link(controlObject) {
        this._controlObject = controlObject;

        // this._controlObject.onLoad = this.onLoad();
    }

}

class LegendSet extends LegendEntry {
    // cannot directly contain another legend set
    /*constructor(name, entries, selecteId) {

        super();

        this._entries = entries;
        this._selectedEntry = null;
    }*/

    // get entries() { return this._entries; }
}

class LegendNode extends LegendEntry {

    get isSelected() { return this._isSelected; }

    select() {
        this._isSelected = true;

        return this;
    }

    deselect() {
        this._isSelected = false;

        return this;
    }

    toggleSelection() {
        this._isSelected = !this._isSelected;

        return this;
    }

}

// who is responsible for populating legend groups with entries? legend service or the legend group itself
class LegendGroup extends LegendEntry {

    // do we want to save this bit of ui (isExpanded) state in bookmark?
    _isExpanded = false;
    _entries = [];

    get isExpanded() { return this._isExpanded; }

    expand() {
        this._isExpanded = true;

        return this;
    }

    collapse() {
        this._isExpanded = false;

        return this;
    }

    toggleExpansion() {
        this._isExpanded = !this._isExpanded;

        return this;
    }

    get entries() { return this._entries; }

    /**
     * @param {LegendEntry} entry
     */
    addEntry(entry, position = this._entries.length) {
        this._entries.splice(position, 0, entry);

        return this;
    }

    /**
     * @param {LegendEntry} entry
     */
    removeEntry(entry) {
        const index = this._entries.indexOf(entry);

        if (index !== -1) {
            this._entries.splice(index, 1);
        }

        return this;
    }
}


class LayerRecordInterface {
    /**
     * @param {Array} availableControls [optional=[]] an array or controls names that are displayed inside the legendEntry
     * @param {Array} disabledControls [optional=[]] an array or controls names that are disabled and cannot be interacted wiht by a user
     */
    constructor(layerRecord, availableControls = [], disabledControls = []) {
        this._layerRecord = layerRecord;
        this._availableControls = availableControls;
        this._disabledConrols = disabledControls;
    }

    _layerRecord;
    _disabledConrols;
    _availableControls;

    static states = {
        loading: 'loading',
        loaded: 'loaded',
        error: 'error'
    };

    _state = LayerRecordInterface.states.loading;

    get isRefreshing() {    throw new Error(`Call not supported.`); }

    get name()  {           throw new Error(`Call not supported.`); }


    get visibility() {      throw new Error(`Call not supported.`); }
    get opacity() {         throw new Error(`Call not supported.`); }
    get boundingBox() {     throw new Error(`Call not supported.`); }
    get query() {           throw new Error(`Call not supported.`); }
    get snapshot() {        throw new Error(`Call not supported.`); }


    setVisibility() {       throw new Error(`Call not supported.`); }
    setOpacity() {          throw new Error(`Call not supported.`); }
    setBoundingBox() {      throw new Error(`Call not supported.`); }
    setQuery() {            throw new Error(`Call not supported.`); }
    setsnapshot() {         throw new Error(`Call not supported.`); }

    /*
        toggleVisibility(value = null)
        toggleQuery(value = null) {}
        toggleBoundingBox(value = null) {}
        toggleSnapshot(value = null) {}
    */

    /*
    get data() {            throw new Error(`Call not supported.`); }
    get metadata() {        throw new Error(`Call not supported.`); }
    get boundaryZoom() {    throw new Error(`Call not supported.`); }
    get refresh() {         throw new Error(`Call not supported.`); }
    get reload() {          throw new Error(`Call not supported.`); }
    get remove() {          throw new Error(`Call not supported.`); }
    get settings() {        throw new Error(`Call not supported.`); }
    */

    get formattedAttributes() { throw new Error(`Call not supported.`); }
}


const co1 = new LayerRecordInterface({},
    ['visibility', 'opacity', 'boundingBox', 'query', 'snapshot', 'data', 'metadata', 'boundaryZoom', 'refresh', 'reload', 'remove', 'settings'],
    ['visibility', 'settings']);

const le1 = new LegendEntry(co1, 'blha');



