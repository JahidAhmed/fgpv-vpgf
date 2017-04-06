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

    function LegendBlockFactory($q, common) {

        let legendBlockCounter = 0;

        const ref = {
            walkFunction,
            aggregateStates,
            getPropertyDescriptor
        };

        // jscs doesn't like enhanced object notation
        // jscs:disable requireSpacesInAnonymousFunctionExpression
        class SymbologyStack {
            constructor(proxy, blockConfig, isInteractive = false) {
                this._proxy = proxy;
                this._blockConfig = blockConfig;
                this._isInteractive = isInteractive;
            }

            get isInteractive () {  return this._isInteractive; }

            _fannedOut = false; // jshint ignore:line
            _expanded = false; // jshint ignore:line

            get stack () {          return this._proxy.symbology || this._blockConfig.symbologyStack; }
            get renderStyle () {    return this._blockConfig.symbologyRenderStyle; }

            get fannedOut () {      return this._fannedOut; }
            set fannedOut (value = !this.fannedOut) {
                this._fannedOut = value;
            }

            get expanded () {       return this._expanded; }
            set expanded (value = !this.expanded) {
                this._expanded = value;
            }
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
            // get blockType () {      return this._blockType; }
            get template () {       return this.blockType; }

            static INFO = 'info'; // jshint ignore:line
            static NODE = 'node'; // jshint ignore:line
            static GROUP = 'group'; // jshint ignore:line
            static SET = 'set'; // jshint ignore:line
        }

        class LegendInfo extends LegendBlock {
            constructor(blockConfig) {
                super({}, blockConfig);
            }

            get blockType () { return LegendBlock.INFO; }

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

            _isSelected = false; // jshint ignore:line

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

            get isSelected () {         return this._isSelected; }
            set isSelected (value) {      this._isSelected = value; return this; }
        }


        class LegendNode extends LegendEntry {

            constructor(proxies, blockConfig, layerConfig) {
                super({}, blockConfig);

                this._mainProxy = proxies.main;
                this._controlledProcies = proxies.adjunct;

                this._layerConfig = layerConfig;

                this._aggregateStates = ref.aggregateStates;
                this._symbologyStack =
                    new SymbologyStack(this._mainProxy, blockConfig, true);
            }

            //_blockType = LegendBlock.NODE;
            get blockType () { return LegendBlock.NODE; }

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

            get symbologyStack () {     return this._symbologyStack; }

            get metadataUrl () {        return this._layerConfig.metadataUrl; }
            get catalogueUrl () {       return this._layerConfig.catalogueUrl; }
        }

        // who is responsible for populating legend groups with entries? legend service or the legend group itself
        class LegendGroup extends LegendEntry {

            constructor(blockConfig) {
                super();

                this._name = blockConfig.name;
                this._expanded = blockConfig.expanded;
                this._availableControls = blockConfig.controls;
                this._disabledControls = blockConfig.disabledControls;

                this._aggregateStates = ref.aggregateStates;
                this._walk = ref.walkFunction.bind(this);
            }

            //_blockType = LegendBlock.GROUP;
            get blockType () { return LegendBlock.GROUP; }

            _entries = [];

            // get _allProxies () {        return this.entries.map(entry => entry.layerProxy; }

            get availableControls () {  return this._availableControls; }
            get disabledControls () {   return this._disabledControls; }

            get state () {
                if (this.entries.length === 0) {
                    return 'rv-loading';
                } else {
                    return 'rv-loaded';
                }
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

            get visibility () {
                return this._activeEntries.some(entry =>
                    entry.visibility);
            }
            set visibility (value) {
                this._activeEntries.forEach(entry =>
                    (entry.visibility = value));

                return this;
            }

            get opacity () {
                const defaultValue = 0.5;
                let isAllSame = false;

                const entries = this._activeEntries;
                const value = entries[0].opacity;

                if (entries.length > 0) {
                    isAllSame = entries.every(entry =>
                        entry.opacity === value);
                }

                return isAllSame ? value : defaultValue;
            }

            set opacity (value) {
                this._activeEntries.forEach(entry =>
                    (entry.opacity = value));

                return this;
            }

            get expanded () {               return this._expanded; }
            set expanded (value = !this.expanded) {
                this._expanded = value;
            }

            get entries () {                return this._entries; }
            get _activeEntries () {
                return this.entries.filter(entry =>
                    entry.blockType === LegendBlock.SET ||
                    entry.blockType === LegendBlock.GROUP ||
                    entry.blockType === LegendBlock.NODE);
            }

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

            _highlightSet = false;

            _decorateDescriptor(prototype, propertyName, decorator) {
                const descriptor = getPropertyDescriptor(prototype, propertyName);
                let method;

                _updateProperty('set');
                _updateProperty('get');

                return descriptor;

                function _updateProperty(name) {
                    if (decorator[name]) {
                        method = descriptor[name] || angular.noop;
                        descriptor[name] = function (value) {
                            decorator[name](value);
                            method.call(this, value);
                        };
                    }
                }
            }

            get blockType () { return LegendBlock.SET; }

            get visibility () {
                return this._activeEntries.some(entry =>
                    entry.visibility);
            }
            set visibility (value) {
                if (value && !this.visibility) {
                    // `this.visibility` will be `false` if there is no entries, so calling [0] should be safe
                    this._activeEntries[0].visibility = true;
                } else {
                    this._activeEntries.forEach(entry =>
                        (entry.visibility = value));
                }

                return this;
            }

            get _activeEntries () {
                return this.entries.filter(entry =>
                    entry.blockType === LegendBlock.GROUP ||
                    entry.blockType === LegendBlock.NODE);
            }
            get entries () { return this._entries; }
            addEntry (entry, position = this._entries.length) {
                // since a set can have at most one visible child,
                // as soon as there is one visible chilld, turn all subsequent children off
                if (this.visibility) {
                    entry.visibility = false;
                }
                this._entries.splice(position, 0, entry);

                // used to propagate positive visibility change up to the containing LegendSet object to turn off all other entries
                const visibilityDecorator = {
                    set: value => {
                        if (value) {
                            this.visibility = false;
                        }
                    }};

                const visibilityPrototype = entry.blockType === LegendBlock.NODE ?
                    LegendNode.prototype : LegendGroup.prototype;

                const visibilityDescriptor =
                    this._decorateDescriptor(visibilityPrototype, 'visibility', visibilityDecorator);

                // LegendSet and the contained LegendBlock object will share a reference to `highlightSet` property
                // which the legend block temlate will use to highlight set elements when hovered/focused
                const highlightSetDescriptor = {
                    get: () =>
                        this._highlightSet,
                    set: value => {
                        this._highlightSet = value;
                    }
                };

                Object.defineProperty(entry, 'visibility', visibilityDescriptor);
                Object.defineProperty(entry, 'highlightSet', highlightSetDescriptor);

                entry.highlightSet = false;

                return this;
            }

            get highlightSet() { return this._highlightSet; }

            removeEntry (entry) {
                const index = this._entries.indexOf(entry);

                if (index !== -1) {
                    this._entries.splice(index, 1);
                }

                return this;
            }

            setVisibility (...args) {
                console.log(args);
            }

            walk (callback) {
                return this._walk(callback);
            }
        }
        // jscs doesn't like enhanced object notation
        // jscs:enable requireSpacesInAnonymousFunctionExpression

        const service = {
            Block: LegendBlock,
            Node: LegendNode,
            Group: LegendGroup,
            Set: LegendSet,
            Info: LegendInfo
        };

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

        /**
         * Returns a property descritpion of the specified object.
         *
         * @function getPropertyDescriptor
         * @private
         * @param {Object} obj object to get a descript from; usually a prototype
         * @param {String} property property name
         */
        function getPropertyDescriptor(obj, property) {
            if (obj === null) {
                return null;
            }

            const descriptor = Object.getOwnPropertyDescriptor(obj, property);

            if (obj.hasOwnProperty(property)) {
                return Object.getOwnPropertyDescriptor(obj, property);
            } else {
                return getPropertyDescriptor(Object.getPrototypeOf(obj), property);
            }
        }
    }
})();
