
// fields blueprints to be added to the table header for large layout and inside setting panel
// `self` property is named so intentionally, as it will be passed on a scope to the FILTERS_TEMPLATE
const FILTERS = {
    string: {
        name: 'rv-filter-string',
        scope: null,
        self: {
            isFunction: angular.isFunction,
            placeholder: 'filter.placeholder.string',
            change: angular.noop,
            prevent: angular.noop
        }
    },
    selector: {
        name: 'rv-filter-selector',
        scope: null,
        self: {
            isFunction: angular.isFunction,
            placeholder: 'filter.placeholder.selector',
            change: angular.noop,
            prevent: angular.noop
        }
    },
    number: {
        name: 'rv-filter-number',
        scope: null,
        self: {
            isFunction: angular.isFunction,
            min: {
                placeholder: 'filter.placeholder.min'
            },
            max: {
                placeholder: 'filter.placeholder.max'
            },
            change: angular.noop,
            prevent: angular.noop
        }
    },
    date: {
        name: 'rv-filter-date',
        scope: null,
        self: {
            isFunction: angular.isFunction,
            min: {
                placeholder: 'filter.placeholder.datemin'
            },
            max: {
                placeholder: 'filter.placeholder.datemax'
            },
            change: angular.noop,
            prevent: angular.noop
        }
    }
};

const columnNameMap = { };
let counter = 0;

// jscs:disable maximumLineLength
const FILTERS_TEMPLATE = {
    string: column =>
        `<div class="rv-filter-string" ng-show="self.${column}.filtersVisible">
            <md-input-container class="md-block" md-no-float flex>
                <input ng-click="self.prevent($event)"
                        ng-keypress="self.prevent($event)"
                        ng-change="self.change('${columnNameMap[column]}', self.${column}.value)"
                        ng-model="self.${column}.value" class="ng-pristine ng-valid md-input ng-touched" placeholder="{{ self.placeholder | translate }}"
                        ng-disabled="self.${column}.static" />
            </md-input-container>
        </div>`,
    selector: column =>
        `<div class="rv-filter-selector" ng-show="self.${column}.filtersVisible">
            <md-input-container class="md-block" md-no-float flex>
                <md-select ng-click="self.prevent($event)"
                    ng-model="self.${column}.value"
                    md-on-close="self.change('${columnNameMap[column]}', self.${column}.value)"
                    ng-disabled="self.${column}.static"
                    placeholder="{{ self.placeholder | translate }}" multiple>
                    <md-option ng-repeat="value in self.${column}.values" ng-value="value" ng-selected="self.${column}.init.includes(value)">
                        {{ value }}
                    </md-option>
                </md-select>
            </md-input-container>
        </div>`,
    number: column =>
        `<div class="rv-filter-number" ng-show="self.${column}.filtersVisible">
            <md-input-container class="md-block" md-no-float flex>
                <input rv-table-number-only
                        ng-click="self.prevent($event)"
                        ng-change="self.change('${columnNameMap[column]}', self.${column}.min, self.${column}.max)"
                        ng-model="self.${column}.min" class="ng-pristine ng-valid md-input ng-touched" placeholder="{{ self.min.placeholder | translate }}"
                        ng-disabled="self.${column}.static" />
            </md-input-container>
            <md-input-container class="md-block" md-no-float flex>
                <input rv-table-number-only
                        ng-click="self.prevent($event)"
                        ng-change="self.change('${columnNameMap[column]}', self.${column}.min, self.${column}.max)"
                        ng-model="self.${column}.max" class="ng-pristine ng-valid md-input ng-touched" placeholder="{{ self.max.placeholder | translate }}"
                        ng-disabled="self.${column}.static" />
            </md-input-container>
        </div>`,
    date: column =>
        `<div class="rv-filter-date" ng-show="self.${column}.filtersVisible">
            <md-datepicker
                ng-click="self.prevent($event)"
                ng-change="self.change('${columnNameMap[column]}', self.${column}.min, self.${column}.max)"
                ng-model="self.${column}.min"
                md-placeholder="{{ self.min.placeholder | translate }}"
                ng-disabled="self.${column}.static">
            </md-datepicker>
            <md-datepicker
                ng-click="self.prevent($event)"
                ng-change="self.change('${columnNameMap[column]}', self.${column}.min, self.${column}.max)"
                ng-model="self.${column}.max"
                md-placeholder="{{ self.max.placeholder | translate }}"
                ng-disabled="self.${column}.static">
            </md-datepicker>
        </div>`
};
// jscs:enable maximumLineLength

/**
 * @module rvTableDefinition
 * @memberof app.ui
 * @restrict E
 * @description
 *
 * The `rvTableDefinition` directive for a filters setting panel.
 *
 */
angular
    .module('app.ui')
    .directive('rvTableDefinition', rvTableDefinition);

/**
 * `rvTableDefinition` directive body.
 *
 * @function rvTableDefinition
 * @return {object} directive body
 */
function rvTableDefinition(stateManager, events, $compile, tableService, referenceService, $rootScope, $filter) {
    const directive = {
        restrict: 'A',
        template: '',
        replace: true,
        transclude: true,
        scope: { info: '=' },
        link,
        controller: Controller,
        controllerAs: 'self',
        bindToController: true
    };

    return directive;

    function link(scope, el, attr, ctrl, transclude) {

        // columns type with filters information
        const columnTypes = {
            string: {
                callback: 'onFilterStringChange'
            },
            selector: {
                callback: 'onFilterSelectorChange'
            },
            number: {
                callback: 'onFilterNumberChange'
            },
            date: {
                callback: 'onFilterDateChange'
            }
        };

        // use transclude to have access to filters inside ng-repeat in filters-setting-panel
        transclude(() => {
            if (!el[0].hasChildNodes() && typeof scope.self.info !== 'undefined' &&
                (scope.self.info.data !== 'rvSymbol' && scope.self.info.data !== 'rvInteractive')) {
                // if filter is not visible. This happen for customize columns where user doesn't want to have a filter.
                if (typeof scope.self.info.filter !== 'undefined') {
                    const filterInfo = setFilter(scope.self.info);
                    el.append(filterInfo.directive);
                    scope.self.info.init = true;
                }
            }
        });

        // wait for table to finish init before we create filters on table
        scope.$on(events.rvTableReady, () => {
            // if info === columns, set filters for datatables
            if (attr.info === 'columns') {
                // datatables is created each time so add the filters
                setFilters(el);
            }
        });

        /**
         * Filters initialization
         * @function setFilters
         * @private
         * @param {Object} el element to add filter to
         */
        function setFilters() {
            const table = tableService.getTable();
            const displayData = stateManager.display.table.data;

            // make sure there is item inside columns (it is null first time it is run)
            const columns = displayData.columns !== null ? displayData.columns : [];

            columns.forEach((column, i) => {
                // skip the symbol, interactive columns and if the filter is not visible/searchable.
                // this happen for customize columns where user doesn't want to have a filter.
                if (typeof column.filter !== 'undefined' && column.searchable) {

                    // get column directive, scope and type
                    const filterInfo = setFilter(column);

                    // check if filterInfo is define. Because we have ng-if columns on setting panel to wait until columns is set before
                    // we call dragula with the proper scope filterInfo is not define for symbol and interactive
                    if (typeof filterInfo !== 'undefined') {
                        // set filters on table for numbers and date (they are global and they apply themselve automatically)
                        // set string filter from existing value
                        if (column.type === 'number') {
                            setNumberFilter(filterInfo.scope, i);
                        } else if (column.type === 'date') {
                            setDateFilter(filterInfo.scope, i);
                        } else if (column.type === 'string') {
                            const val = `^${column.filter.value.replace(/\*/g, '.*')}.*$`;
                            table.column(`${column.name}:name`).search(jQuery.fn.DataTable.ext.type.search.string(val), true, false);
                        } else if (column.type === 'selector') {
                            setSelectorFilter(filterInfo.scope, table, column);
                        }

                        // add to table
                        $(table.columns(`${column.data}:name`).header()[0]).append(filterInfo.directive);
                    }
                }
            });

            // set the temporary array of filters to the real datatable filter array. This way datatables doesn't redraw each time a filter is added
            $.fn.dataTable.ext.search = $.fn.dataTable.ext.searchTemp;

            // draw table when all string filter have been set
            table.draw();
        }

        /**
         * Set filter from field type
         * @function setFilter
         * @private
         * @param {Object} column the column
         * @return {Object} array  [the directive for the filter, the scope]
         */
        function setFilter(column) {
            // set change action (callback)
            const filter = FILTERS[column.type];
            filter.self.change = tableService[columnTypes[column.type].callback];

            // set prevent default sorting
            filter.self.prevent = tableService.preventSorting;

            // set filter initial value
            filter.self[column] = column.filter;

            // set scope
            const filterScope = scope.$new(true);
            filterScope.self = filter.self;
            filter.scope = filterScope;

            // Using default column name results in errors with specific characters (accents, brackets, etc.) for template data binding
            // Need to provide a simplified column name for data binding and also keep a reference to the default name
            // https://github.com/fgpv-vpgf/fgpv-vpgf/issues/2019
            if (!column.simpleColumnName) {
                const simpleColumnName = 'a' + counter;
                column.simpleColumnName = simpleColumnName;
                columnNameMap[simpleColumnName] = column.name;
                counter++;
            }

            filter.scope.self[column.simpleColumnName] = column.filter;

            $rootScope.$watch(() => referenceService.isFiltersVisible, val => { filter.self[column.simpleColumnName].filtersVisible = val });

            // create directive
            const template = FILTERS_TEMPLATE[column.type](column.simpleColumnName);

            // return directive, scope and column type
            return {
                directive: $compile(template)(filter.scope),
                scope: filter.scope.self[column.simpleColumnName]
            };
        }

        /**
         * Add a custom number filter to datatable
         * https://datatables.net/examples/plug-ins/range_filtering.html
         * @function setNumberFilter
         * @private
         * @param {Object} filter the filter object who contains filter values { min, max }
         * @param {Integer} index    the column index to retreive the data to filter on
         */
        function setNumberFilter(filter, index) {
            $.fn.dataTable.ext.searchTemp.push((settings, data) => {
                let flag = false;
                const i = settings._colReorder.fnTranspose(index); // get the real index if columns have been reordered
                const min = parseFloat(filter.min, 10);
                const max = parseFloat(filter.max, 10);
                const val = parseFloat(data[i]) || 0;

                if ((isNaN(min) && isNaN(max)) || (isNaN(min) && val <= max) ||
                    (min <= val && isNaN(max)) || (min <= val && val <= max)) {
                    flag = true;
                }

                return flag;
            });
        }

        /**
         * Add a custom date filter to datatable
         * @function setDateFilter
         * @private
         * @param {Object} filter the filter object who contains filter values { min, max }
         * @param {Integer} index    the column index to retreive the data to filter on
         */
        function setDateFilter(filter, index) {
            // eslint-disable-next-line complexity
            $.fn.dataTable.ext.searchTemp.push((settings, data) => {
                // check if it is a valid date and remove leading 0 because it doesn't set the date properly
                const i = settings._colReorder.fnTranspose(index); // get the real index if columns have been reordered
                if (i === -1) { return false; }

                // Date value is null, only show row if there are no filters
                if (data[i] === '') {
                    return !filter.min && !filter.max;
                }

                const dateOnly = data[i].split(' ')[0];
                const time = $filter('dateTimeZone')(dateOnly, '');

                let val = false;
                if (time !== 'Invalid date') {
                    val = new Date(time);
                }

                if (val && !isNaN(val.getTime())) {
                    const min = filter.min ? filter.min : new Date(-8640000000000000);
                    const max = filter.max ? filter.max : new Date(8640000000000000);

                    // Get the primitive value
                    const minPrim = min.valueOf();
                    const maxPrim = max.valueOf();
                    const valPrim = val.valueOf();

                    return (valPrim >= minPrim && valPrim <= maxPrim)
                } else {
                    return false;
                }
            });
        }

        /**
         * Add a custom selector filter to datatable
         * @function setSelectorFilter
         * @private
         * @param {Object} filter the filter object who contains filter values { min, max }
         * @param {Object} table    the table
         * @param {Object} column    the column
         */
        function setSelectorFilter(filter, table, column) {
            // set options for the selector then set filter (split with | for or and remove the ")
            filter.values = table.column(`${column.name}:name`).data().unique()
                .sort().map(val => `${val}`);

            if (column.filter.value.length !== 0) {
                // when value comes from the authoring tool, it is a string, not an array
                const array = JSON.parse(column.filter.value);

                // create the regex to select value
                const val = `^${array.join('|').replace(/"/g, '')}.*$`;
                table.column(`${column.name}:name`).search(jQuery.fn.DataTable.ext.type.search.string(val), true, false);

                // set initial value
                filter.init = array;
            }
        }
    }
}

function Controller(tableService) {
    'ngInject';
    const self = this;

    self.tableService = tableService;
}
