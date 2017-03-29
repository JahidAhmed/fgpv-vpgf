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

        /* -------- */
        // jscs:enable

        // jscs:disable requireSpacesInAnonymousFunctionExpression
        class LegendBlock {
            constructor (layerProxy) {

                // this._id = `${this.blockType}_${++legendBlockCounter}`;

                this._layerProxy = layerProxy;

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

            get layerProxy () {
                return this._layerProxy;
            }

            get blockType () {
                return this._blockType;
            }

            get template () {
                return this._blockType;
            }

            static INFO = 'info';
            static NODE = 'node';
            static GROUP = 'group';
            static SET = 'set';
        }

        class LegendInfo extends LegendBlock {
            constructor(...args) {
                super(...args);
            }

            _blockType = LegendBlock.INFO;
        }

        // abstract
        class LegendEntry extends LegendBlock {

            constructor(...args) {
                super(...args);
            }

            // _isSelected = false;

            // TODO: turn state names and template names to consts
            get template () {
                const stateToTemplate = {
                    'rv-loading': () => 'placeholder',
                    'rv-loaded': () => super.template,
                    'rv-error': () => 'error'
                };

                return stateToTemplate['rv-loaded' || this.layerProxy.state]();
            }

            get sortGroup () {
                const sortGroups = Geo.Layer.SORT_GROUPS_;

                return -1;

                if (this.layerProxy.layerType) {
                    return sortGroups[this.layerProxy.layerType];
                }

                return -1;
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

        class LegendNode extends LegendEntry {

            constructor(...args) {
                 super(...args);

             }

            _blockType = LegendBlock.NODE;

            get isSelected () { return this._isSelected; }

            select () {
                this._isSelected = true;

                return this;
            }

            deselect () {
                this._isSelected = false;

                return this;
            }

            toggleSelection () {
                this._isSelected = !this._isSelected;

                return this;
            }

        }

        // who is responsible for populating legend groups with entries? legend service or the legend group itself
        class LegendGroup extends LegendEntry {

             constructor(...args) {
                 super(...args);

                 this._entries = [];
                 this._isExpanded = true;

                 this._walk = ref.walkFunction.bind(this);
             }

            _blockType = LegendBlock.GROUP;

            // do we want to save this bit of ui (isExpanded) state in bookmark?
            // _isExpanded = false;
            // _entries = [];

            get isExpanded () { return this._isExpanded; }

            expand () {
                this._isExpanded = true;

                return this;
            }

            collapse () {
                this._isExpanded = false;

                return this;
            }

            toggleExpansion () {
                this._isExpanded = !this._isExpanded;

                return this;
            }

            get entries () { return this._entries; }

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

        const service = {
            Block: LegendBlock,
            Node: LegendNode,
            Group: LegendGroup,
            Set: LegendSet,
            Info: LegendInfo
        };

        const ref = {
            walkFunction,
        }

        return service;

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
