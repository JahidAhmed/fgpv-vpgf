(() => {
    'use strict';

    /**
     * @module LegendBlockFactory
     * @memberof app.geo
     * @requires dependencies
     * @description
     *
     *
     */
    angular
        .module('app.geo')
        .factory('LegendBlock', LegendBlockFactory);

    function LegendBlockFactory($rootScope, Geo) {

        let legendBlockCounter = 0;

        class SymbologyStack {
            constructor(symbology, isInteractive = false) {
                this._symbology = symbology;
                this._isInteractive = isInteractive;
            }

            get isInteractive () {  return this._isInteractive; }

            _isFannedOut = false;
            _isExpanded = false;

            get stack () {          return this._symbology.stack; }
            get renderStyle () {    return this._symbology.renderStyle; }

            get isFannedOut () {    return this._isFannedOut; }
            get isExpanded () {     return this._isExpanded; }

            fanOut (value = !this.isFannedOut) { this._isFannedOut = value; }
            expand (value = !this.isExpanded) { this._isExpanded = value; }
        }

        /* -------- */
        // jscs:enable

        // jscs:disable requireSpacesInAnonymousFunctionExpression
        class LegendBlock {
            constructor (layerProxy, blockConfig) {

                // this._id = `${this.blockType}_${++legendBlockCounter}`;

                // this._layerProxy = layerProxy;
                this._blockConfig = blockConfig;

                /*Object.defineProperty(this._layerProxy.main, 'isRefreshing', {
                    get: () => false,
                    enumerable: true,
                    configurable: true
                });*/
            }

            // _id;
            // _layerProxy;

            get id () {
                if (!this._id) {
                    this._id = `${this.blockType}_${++legendBlockCounter}`;
                }

                return this._id;
            }

            // get layerProxy () {     return this._layerProxy; }

            get blockConfig () {    return this._blockConfig; }
            get blockType () {      return this._blockType; }
            get template () {       return this._blockType; }

            static INFO = 'info';
            static NODE = 'node';
            static GROUP = 'group';
            static SET = 'set';
        }

        class LegendInfo extends LegendBlock {
            constructor(blockConfig) {
                super({}, blockConfig);
            }

            _blockType = LegendBlock.INFO;

            get infoType () {   return this.blockConfig.infoType; }
            get content () {    return this.blockConfig.content; }
        }

        // can be node or group
        class LegendEntry extends LegendBlock {

            constructor(...args) {
                super(...args);
            }

            // get availableControls () { return this.config.controls; }
            // get disabledControls () { return this.config.controls; }

            // _isSelected = false;

            // TODO: turn state names and template names to consts
            /*get template () {
                const stateToTemplate = {
                    'rv-loaded': () => super.template,
                    'rv-refresh': () => super.template,
                    'rv-loading': () => 'placeholder',
                    'rv-error': () => 'error'
                };

                return stateToTemplate[this._layerProxy.state]();
            }*/

            /*get sortGroup () {
                return -1;

                const sortGroups = Geo.Layer.SORT_GROUPS_;

                if (this._layerProxy.layerType) {
                    return sortGroups[this._layerProxy.layerType];
                }

                return -1;
            }*/
        }

        class LegendNode extends LegendEntry {

            constructor(proxies, blockConfig, layerConfig) {
                 super({}, blockConfig);

                 this._mainProxy = proxies.main;
                 this._controlledProcies = proxies.adjunct;

                 this._layerConfig = layerConfig;

                 // dynamic children might not support opacity
                 // TODO: check controlled proxies as well
                 if (!this._mainProxy.isOpacityAvailable) {
                    // removeFromArray(this.availableControls, 'opacity');
                 }

                 this._aggregateStates = ref.aggregateStates;
                 this._symbologyStack = new SymbologyStack(this._mainProxy.symbology, true);
             }

            _blockType = LegendBlock.NODE;

            get _allProxies () {        return [this._mainProxy].concat(this._controlledProcies); }

            get availableControls () {  return this._layerConfig.controls; }
            get disabledControls () {   return this._layerConfig.disabledControls; }

            get state () {
                const allStates = this._allProxies.map(proxy => proxy.state);
                const combinedState = this._aggregateStates(allStates);

                return combinedState;
            }

            get template () {
                const stateToTemplate = {
                    'rv-loading': () => 'placeholder',
                    'rv-loaded': () => super.template,
                    'rv-refresh': () => super.template,
                    'rv-error': () => 'error'
                };

                return stateToTemplate[this.state]();
            }

            get isRefreshing () {
                const state = this.state;

                return state === 'rv-loading' || state === 'rv-refresh';
            }

            get name () {               return (this._mainProxy || this._config).name; }
            get layerType () {          return this._mainProxy.layerType; }
            get featureCount () {       return this._mainProxy.featureCount; }
            get geometryType () {       return this._mainProxy.geometryType; }

            get visibility () {         return this._mainProxy.visibility; }
            set visibility (value) {
                this._allProxies.forEach(proxy => {
                    // TODO: try/catch
                    proxy.setVisibility(value);
                });

                return this;
            }

            get opacity () {            return this._mainProxy.opacity; }
            set opacity (value) {
                this._allProxies.forEach(proxy => {
                    // TODO: try/catch
                    proxy.setOpacity(value);
                });

                return this;
            }

            get isSelected () {         return this._isSelected; }
            set isSelect (value) {      this._isSelected = value; return this; }

            get symbologyStack () {     return this._symbologyStack; }
        }

        function removeFromArray(array, name) {
            var index = array.indexOf(name);
            if (index !== -1) {
                array.splice(index, 1);
            }
        }

        // who is responsible for populating legend groups with entries? legend service or the legend group itself
        class LegendGroup extends LegendEntry {

             constructor(name, isExpanded = true) {
                 super();

                 this._name = name;
                 this._isExpanded = isExpanded;

                 this._aggregateStates = ref.aggregateStates;
                 this._walk = ref.walkFunction.bind(this);
             }

            _blockType = LegendBlock.GROUP;

            _entries = [];

            // get _allProxies () {        return this.entries.map(entry => entry.layerProxy; }

            get availableControls () {  return []; this._layerConfig.controls; }
            get disabledControls () {   return []; this._layerConfig.disabledControls; }

            get state () {
                if (this.entries.length === 0) {
                    return 'rv-loading';
                } else {
                    return 'rv-loaded';
                }

                /*
                const states = this.entries.map(entry =>
                    entry.state);
                const combinedState = this._aggregateStates(states);

                return  combinedState;
                */
            }

            get template () {
                const stateToTemplate = {
                    'rv-loading': () => 'placeholder',
                    'rv-loaded': () => super.template//,
                    //'rv-refresh': () => super.template,
                    //'rv-error': () => super.template
                };

                return stateToTemplate[this.state]();
            }

            get isRefreshing () {
                return this.state === 'rv-loading';
            }

            get name () {                   return this._name; }

            get isExpanded () {             return this._isExpanded; }
            expand (value = !this.isExpanded) {
                this._isExpanded = value; return this;
            }

            get entries () {                return this._entries; }

            addEntry (entry, position = this._entries.length) {
                this._entries.splice(position, 0, entry);

                return this;
            }

            removeEntry (entry) {
                const index = this._entries.indexOf(entry);

                if (index !== -1) {
                    this._entries.splice(index, 1);
                }

                return this;
            }

            walk (callback) {
                return this._walk(callback);
            }
        }

        class LegendSet extends LegendEntry {
            // cannot directly contain another legend set
            constructor(...args) {
                super(...args);

                this._entries = [];
                this._entryWatchers = [];
                this._selectedEntry = null;
                this._blockType = LegendBlock.SET;

                this._walk = ref.walkFunction.bind(this);
            }

            _blockType = LegendBlock.SET;

            // TODO: add walk to sets

            get entries () { return this._entries; }

            addEntry (entry, position = this._entries.length) {
                // TODO: consider using .includes; needs IE polyfill
                /*if (['node', 'group'].indexOf(entry.blockType) === -1) {
                    throw new Error(`Legend visibility sets cannot be nested.`);
                }

                if (this._entries.length === 0) {
                    this._selectedEntry = entry;

                    entry.layerProxy.setVisibility(true);
                } else {
                    entry.layerProxy.setVisibility(false);
                }

                // return a watch deregister function
                const entryWatcher = $rootScope.$watch(() => entry.layerProxy.visibility, newValue => {
                    if (newValue) {
                        this._entries
                            .filter(_entry => _entry !== entry)
                            .forEach(_entry => _entry.layerProxy.setVisibility(false));
                    }
                });

                this._entryWatchers.splice(position, 0, entryWatcher);
                this._entries.splice(position, 0, entry);
                */
                return this;
            }

            removeEntry (entry) {
                /*const index = this._entries.indexOf(entry);

                if (index !== -1) {
                    this._entries.splice(index, 1);

                    // stop the watch and remove the watcher
                    this._entryWatchers[index]();
                    this._entryWatchers.splice(index, 1);
                }

                if (this._entries.length === 0) {
                    this._selectedEntry = null;
                }
                */
                return this;
            }

            walk (callback) {
                return this._walk(callback);
            }
        }

        const service = {
            Block: LegendBlock,
            Node: LegendNode,
            Group: LegendGroup,
            Set: LegendSet,
            Info: LegendInfo
        };

        const ref = {
            walkFunction,
            aggregateStates
        }

        return service;

        function aggregateStates(states) {
            const stateNames = ['rv-loading', 'rv-refresh', 'rv-error', 'rv-loaded'];

            const stateValues = stateNames.map(name =>
                states.indexOf(name) !== -1);

            return stateNames[stateValues.indexOf(true)];
        }

        function walkFunction(callback) {
            // roll in the results into a flat array
            return [].concat.apply([], this.entries.map((entry, index) => {
                if (entry.blockType === 'group') {
                    return [].concat(
                        callback(entry, index, this),
                        entry.walk(callback)
                    );
                } else {
                    return callback(entry, index, this);
                }
            }));
        }
    }
})();
