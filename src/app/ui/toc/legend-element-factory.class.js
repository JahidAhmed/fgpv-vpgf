(() => {

    angular
        .module('app.ui')
        .factory('LegendElementFactory', LegendElementFactory);

    function LegendElementFactory($translate, geoService, tocService, legendService) {

        class BaseElement {
            constructor (legendBlock) {
                this._legendBlock = legendBlock;
                this._layerProxy = this._legendBlock.layerProxy; // a shortcut
            }

            get icon () {    return ''; }
            get label () {   return ''; }
            get tooltip () { return this.label; }

            get isVisible () { return this._layerProxy.availableControls.indexOf(this._controlName) !== -1; }
        }

        class BaseControl extends BaseElement {
            action () { }

            get isDisabled () {
                return this._layerProxy.disabledControls.indexOf(this._controlName) !== -1;
            }
        }

        class VisibilityControl extends BaseControl {
            constructor (...args) {
                super(...args);
            }

            _controlName = 'visibility';

            get value () { return this._layerProxy.visibility; }
            set value (value) { this.action(value); }

            get icon () {    return `action:visibility`; }
            get label () {   return `toc.label.visibility.off`; }

            action (value = !this.value) {
                this._layerProxy.setVisibility(value);
            }
        }

        class VisibilityNodeControl extends VisibilityControl {
            constructor (...args) {
                super(...args);
            }

            get icon () {    return `toggle:check_box${this.value ? '' : '_outline_blank'}`; }
            get label () {   return `toc.label.visibility.${this.value ? 'on' : 'off'}`; }
        }

        class VisibilitySetControl extends VisibilityControl {
            constructor (...args) {
                super(...args);
            }

            get icon () {    return `toggle:radio_button_${this._layerProxy.visibility ? '' : 'un'}checked`; }
            get label () {   return `toc.label.visibility.${this._layerProxy.visibility ? 'on' : 'off'}`; }
        }

        class OpacityControl extends BaseControl {
            constructor (...args) {
                super(...args);

                this._controlName = 'opacity';
            }

            get value () { return this._layerProxy.opacity; }
            set value (value) { this.action(value); }

            get icon () {    return 'action:opacity'; }
            get label () {   return 'settings.label.opacity'; }
            action (value) { this._layerProxy.setOpacity(value); }
        }

        class BoundingBoxControl extends BaseControl {
            constructor (...args) {
                super(...args);

                this._controlName = 'boundingBox';
            }

            // FIXME: remove hack!
            _bbon = false;

            get value () { return this._bbon; } // || this._layerProxy.boundingBox; } // TODO: return bbox visibility value
            set value (value) { this.action(value); }

            get icon () {    return 'community:cube-outline'; }
            get label () {   return 'settings.label.boundingBox'; }
            action (value = !this.value) {
                console.info('bb changed');
                this._bbon = value;
                //this._layerProxy.toggleBoundingBox(value);
            }
        }

        class QueryControl extends BaseControl {
            constructor (...args) {
                super(...args);

                this._controlName = 'query';
            }

            get icon () {    return 'communication:location_on'; }
            get label () {   return 'toc.label.query'; }
            action () {      this._layerProxy.toggleQuery(!this._layerProxy.query); }
        }

        class SnapshotControl extends BaseControl {
            constructor (...args) {
                super(...args);

                this._controlName = 'snapshot';
            }

            get value () { return this._layerProxy.snapshot; }

            get icon () {    return 'action:cached'; }
            get label () {   return 'settings.label.snapshot'; }
            action () {      this._layerProxy.setSnapshot(); }
        }

        class MetadataControl extends BaseControl {
            constructor (...args) {
                super(...args);

                this._controlName = 'metadata';
            }

            get icon () {    return 'action:description'; }
            get label () {   return 'toc.label.metadata'; }
            action () {      tocService.toggleMetadata(this._layerProxy); }
        }

        class SettingsControl extends BaseControl {
            constructor (...args) {
                super(...args);

                this._controlName = 'settings';
            }

            get icon () {    return 'image:tune'; }
            get label () {   return 'toc.label.settings'; }
            action () {      tocService.toggleSettings(this._legendBlock); }
        }

        class OffscaleControl extends BaseControl {
            constructor (...args) {
                super(...args);

                this._controlName = 'offscale';
            }

            get icon () {    return `action:zoom_${this._layerProxy.outOfScale ? 'in' : 'out'}`; }
            get label () {   return `toc.label.visibility.zoom${this._layerProxy.outOfScale ? 'In' : 'Out'}`; }
            action () {      geoService.zoomToScale(this._layerProxy); }
        }

        class ReloadControl extends BaseControl {
            constructor (...args) {
                super(...args);

                this._controlName = 'reload';
            }

            get icon () {    return 'navigation:refresh'; }
            get label () {   return 'toc.label.reload'; }
            action () {      legendService.reloadLayer(this._layerProxy); }
        }

        class BoundaryControl extends BaseControl {
            constructor (...args) {
                super(...args);

                this._controlName = 'boundary';
            }

            get icon () {    return 'action:zoom_in'; }
            get label () {   return 'toc.label.boundaryZoom'; }
            action () {      geoService.zoomToBoundary(this._layerProxy); }
        }

        class DataControl extends BaseControl {
            constructor (...args) {
                super(...args);

                this._controlName = 'data';
            }

            get icon () {    return 'community:table-large'; }
            get label () {   return 'toc.label.dataTable'; }
            action () {      tocService.toggleLayerFiltersPanel(this._layerProxy); }
        }

        class RemoveControl extends BaseControl {
            constructor (...args) {
                super(...args);

                this._controlName = 'remove';
            }

            get icon () {    return 'action:delete'; }
            get label () {   return 'toc.label.remove'; }
            action () {      legendService.removeLayer(this._layerProxy); }
        }

        class ReorderControl extends BaseControl {
            constructor (...args) {
                super(...args);

                this._controlName = 'reorder';
            }

            get icon () {    return 'editor:drag_handle'; }
            get label () {   return 'toc.label.reorder'; }
        }

        class SymbologyControl extends BaseControl {
            constructor (...args) {
                super(...args);

                this._controlName = 'symbology';
            }

            get icon () {    return 'maps:layers'; }
            get label () {   return 'toc.label.symbology'; }
            action () {
                this._legendBlock.toggleSymbology();
                this._legendBlock.wiggleSymbology();
            }
        }

        class BaseFlag extends BaseElement {
            get data () { return {}; }
            get style () { return ''; }
        }

        class TypeFlag extends BaseFlag {
            constructor (...args) {
                super(...args);

                this._controlName = 'type';
            }

            // TODO: remove; geoapi will return unresolved while the layer type is retrieved and unknown if it cannot retrieve it from the service
            static unresolvedType = 'unresolved';

            get _styles () {
                return {
                    unresolved: 'rv-spinning'
                };
            }

            get _icons () {
                const { geometryType } = this._layerProxy;

                return {
                    unknown: 'community:help',
                    unresolved: 'action:cached',
                    get esriFeature () {
                        return {
                            esriGeometryPoint: 'community:vector-point',
                            esriGeometryPolygon: 'community:vector-polygon',
                            esriGeometryPolyline: 'community:vector-polyline'
                        }[geometryType];
                    },
                    esriDynamic: 'action:settings',
                    esriDynamicLayerEntry: 'image:photo',
                    ogcWms: 'image:photo',
                    ogcWmsLayerEntry: 'image:photo',
                    esriImage: 'image:photo',
                    esriTile: 'image:photo'
                };
            }

            get _labels () {
                return {
                    unknown: 'toc.label.flag.unknown',
                    unresolved: 'toc.label.flag.unresolved',
                    esriFeature: 'toc.label.flag.feature',
                    esriDynamic: 'toc.label.flag.dynamic',
                    esriDynamicLayerEntry: 'toc.label.flag.dynamic',
                    ogcWms: 'toc.label.flag.wms',
                    ogcWmsLayerEntry: 'toc.label.flag.wms',
                    esriImage: 'toc.label.flag.image',
                    esriTile: 'toc.label.flag.tile'
                };
            }

            get data () {
                const { layerType, geometryType, featureCount } = this._layerProxy;

                const dataObject = {
                    unknown: 'toc.label.flag.unknown',
                    unresolved: {},
                    get _countData() {
                        return {
                            count: featureCount,

                            // need to translate the substution variable itself; can't think of any other way :(
                            typeName: $translate
                                .instant(`geometry.type.${geometryType}`)
                                .split('|')[featureCount === 1 ? 0 : 1]
                        };
                    },
                    get esriFeature() { return this._countData; },
                    get esriDynamic() { return this._countData; }
                }[layerType || TypeFlag.unresolvedType];

                return dataObject;
            }

            get style () {   return this._styles[this._layerProxy.layerType || TypeFlag.unresolvedType]; }
            get icon () {    return this._icons[this._layerProxy.layerType || TypeFlag.unresolvedType]; }
            get label () {   return this._labels[this._layerProxy.layerType || TypeFlag.unresolvedType]; /* include feature count and feature types ? */ }

            get isVisible () { return true; }
        }

        class ScaleFlag extends BaseFlag {
            constructor (...args) {
                super(...args);

                this._controlName = 'scale';
            }

            get icon () {    return 'maps:layers_clear'; }
            get label () {   return 'toc.label.flag.scale'; }

            get isVisible () { return true; }
        }

        class DataFlag extends BaseFlag {
            constructor (...args) {
                super(...args);

                this._controlName = 'data';
            }

            get icon () {    return 'community:table-large'; }
            get label () {   return 'toc.label.flag.data.table'; }

            get isVisible () { return true; }
        }

        class QueryFlag extends BaseFlag {
            constructor (...args) {
                super(...args);

                this._controlName = 'query';
            }

            get icon () {    return 'community:map-marker-off'; }
            get label () {   return 'toc.label.flag.query'; }

            get isVisible () { return true; }
        }

        class UserFlag extends BaseFlag {
            constructor (...args) {
                super(...args);

                this._controlName = 'user';
            }

            get icon () {    return 'social:person'; }
            get label () {   return 'toc.label.flag.user'; }

            get isVisible () { return true; }
        }

        class FilterFlag extends BaseFlag {
            constructor (...args) {
                super(...args);

                this._controlName = 'filter';
            }

            get icon () {    return 'community:filter'; }
            get label () {   return 'toc.label.flag.filter'; }

            get isVisible () { return true; }
        }

        const controlTypes = {
            flag: 'flag',
            control: 'control'
        };

        const typeToClass = {
            flag: {
                type: TypeFlag,
                scale: ScaleFlag,
                data: DataFlag,
                query: QueryFlag,
                user: UserFlag,
                filter: FilterFlag
            },
            control: {
                visibility: VisibilityControl,
                visibilitynode: VisibilityNodeControl,
                visibilityset: VisibilitySetControl,
                opacity: OpacityControl,
                boundingbox: BoundingBoxControl,
                query: QueryControl,
                snapshot: SnapshotControl,
                metadata: MetadataControl,
                settings: SettingsControl,
                offscale: OffscaleControl,
                reload: ReloadControl,
                boundary: BoundaryControl,
                data: DataControl,
                remove: RemoveControl,
                reorder: ReorderControl,
                symbology: SymbologyControl
            }
        };

        // jscs doesn't like enhanced object notation
        // jscs:disable requireSpacesInAnonymousFunctionExpression
        return {
            makeControl(legendBlock, controlName) {
                return new typeToClass[controlTypes.control][controlName](legendBlock);
            },

            makeFlag(legendBlock, controlName) {
                return new typeToClass[controlTypes.flag][controlName](legendBlock);
            }
        };
        // jscs:enable requireSpacesInAnonymousFunctionExpression
    }

})();
