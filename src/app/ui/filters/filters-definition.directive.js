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

// jscs:disable maximumLineLength
const FILTERS_TEMPLATE = {
    string: column =>
        `<div class="rv-filter-string" ng-show="self.${column}.filtersVisible">
            <md-input-container class="md-block" md-no-float flex>
                <input ng-click="self.prevent($event)"
                        ng-keypress="self.prevent($event)"
                        ng-change="self.change('${column}', self.${column}.value)"
                        ng-model="self.${column}.value" class="ng-pristine ng-valid md-input ng-touched" placeholder="{{ self.placeholder | translate }}"
                        ng-disabled="self.${column}.static" />
            </md-input-container>
        </div>`,
    selector: column =>
        `<div class="rv-filter-selector" ng-show="self.${column}.filtersVisible">
            <md-input-container class="md-block" md-no-float flex>
                <md-select ng-click="self.prevent($event)"
                    ng-model="self.${column}.value"
                    md-on-close="self.change('${column}', self.${column}.value)"
                    ng-disabled="self.${column}.static"
                    placeholder="{{ self.placeholder | translate }}" multiple>
                    <md-option ng-repeat="value in self.${column}.values" ng-value="value">
                        {{ value }}
                    </md-option>
                </md-select>
            </md-input-container>
        </div>`,
    number: column =>
        `<div class="rv-filter-number" ng-show="self.${column}.filtersVisible">
            <md-input-container class="md-block" md-no-float flex>
                <input rv-filters-number-only
                        ng-click="self.prevent($event)"
                        ng-change="self.change('${column}', self.${column}.min, self.${column}.max)"
                        ng-model="self.${column}.min" class="ng-pristine ng-valid md-input ng-touched" placeholder="{{ self.min.placeholder | translate }}"
                        ng-disabled="self.${column}.static" />
            </md-input-container>
            <md-input-container class="md-block" md-no-float flex>
                <input rv-filters-number-only
                        ng-click="self.prevent($event)"
                        ng-change="self.change('${column}', self.${column}.min, self.${column}.max)"
                        ng-model="self.${column}.max" class="ng-pristine ng-valid md-input ng-touched" placeholder="{{ self.max.placeholder | translate }}"
                        ng-disabled="self.${column}.static" />
            </md-input-container>
        </div>`,
    date: column =>
        `<div class="rv-filter-date" ng-show="self.${column}.filtersVisible">
            <md-datepicker
                ng-click="self.prevent($event)"
                ng-change="self.change('${column}', self.${column}.min, self.${column}.max)"
                ng-model="self.${column}.min"
                md-placeholder="{{ self.min.placeholder | translate }}"
                ng-disabled="self.${column}.static">
            </md-datepicker>
            <md-datepicker
                ng-click="self.prevent($event)"
                ng-change="self.change('${column}', self.${column}.min, self.${column}.max)"
                ng-model="self.${column}.max"
                md-placeholder="{{ self.max.placeholder | translate }}"
                ng-disabled="self.${column}.static">
            </md-datepicker>
        </div>`
};
// jscs:enable maximumLineLength

/**
 * @module rvFiltersDefinition
 * @memberof app.ui
 * @restrict E
 * @description
 *
 * The `rvFiltersDefinition` directive for a filters setting panel.
 *
 */
angular
    .module('app.ui')
    .directive('rvFiltersDefinition', rvFiltersDefinition);

/**
 * `rvFiltersDefinition` directive body.
 *
 * @function rvFiltersDefinition
 * @return {object} directive body
 */
function rvFiltersDefinition(stateManager, events, $compile, filterService, layoutService, $rootScope) {
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
            const table = filterService.getTable();
            const displayData = stateManager.display.filters.data;

            // make sure there is item inside columns (it is null first time it is run)
            const columns = displayData.columns !== null ? displayData.columns : [];

            columns.forEach((column, i) => {
                // skip the symbol, interactive columns and if the filter is not visible.
                // this happen for customize columns where user doesn't want to have a filter.
                if (typeof column.filter !== 'undefined') {

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
                            table.column(`${column.name}:name`).search(val, true, false);
                        } else if (column.type === 'selector') {
                            // set options for the selector then set filter (split with | for or and remove the ")
                            filterInfo.scope.values = table.column(`${column.name}:name`).data().unique()
                                .sort().map(val => `"${val}"`);
                            const val = `^${column.filter.value.join('|').replace(/"/g, '')}.*$`;
                            table.column(`${column.name}:name`).search(val, true, false);
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
            filter.self.change = filterService[columnTypes[column.type].callback];

            // set prevent default sorting
            filter.self.prevent = filterService.preventSorting;

            // set filter initial value
            filter.self[column] = column.filter;

            // set scope
            const filterScope = scope.$new(true);
            filterScope.self = filter.self;
            filter.scope = filterScope;
            filter.scope.self[column.name] = column.filter;

            $rootScope.$watch(() => layoutService.isFiltersVisible, val => { filter.self[column.name].filtersVisible = val });

            // create directive
            const template = FILTERS_TEMPLATE[column.type](column.name);

            // return directive, scope and column type
            return {
                directive: $compile(template)(filter.scope),
                scope: filter.scope.self[column.name]
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
                let flag = false;
                const i = settings._colReorder.fnTranspose(index); // get the real index if columns have been reordered
                const date = data[i].split('-');
                const val = (date.length === 3) ?
                    new Date(`${date[0]}-${parseInt(date[1])}-${parseInt(date[2])}`) : false;

                if (val) {
                    // check date
                    const min = (filter.min !== null) ? filter.min : false;
                    const max = (filter.max !== null) ? filter.max : false;

                    if ((val >= min && !max) || (!min && val <= max) || (val >= min && val <= max)) {
                        flag = true;
                    }
                }

                return flag;
            });
        }
    }
}

function Controller(filterService) {
    'ngInject';
    const self = this;

    self.filterService = filterService;
}
