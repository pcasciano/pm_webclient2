/**
 * @requires plugins/Tool.js
 * @include OpenLayers/StyleMap.js
 * @include OpenLayers/Rule.js
 * @include OpenLayers/Control/Measure.js
 * @include OpenLayers/Layer/Vector.js
 * @include OpenLayers/Handler/Path.js
 * @include OpenLayers/Handler/Polygon.js
 * @include OpenLayers/Renderer/SVG.js
 * @include OpenLayers/Renderer/VML.js
 * @include OpenLayers/Renderer/Canvas.js
 * @include GeoExt/Action.js
 */

Ext.define('gxp.plugins.Measure', {
    extend: 'gxp.plugins.Tool',
    alias: 'plugin.gxp_measure',
    requires: ['Ext.tip.ToolTip', 'Ext.SplitButton', 'Ext.menu.Menu', 'Ext.menu.CheckItem', 'GeoExt.Action'],
    outputTarget: "map",
    buttonText: "Measure",
    lengthMenuText: "Length",
    areaMenuText: "Area",
    lengthTooltip: "Measure length",
    areaTooltip: "Measure area",
    measureTooltip: "Measure",
    destroy: function() {
        this.button = null;
        gxp.plugins.Measure.superclass.destroy.apply(this, arguments);
    },
    createMeasureControl: function(handlerType, title) {

        var styleMap = new OpenLayers.StyleMap({
            "default": new OpenLayers.Style(null, {
                rules: [new OpenLayers.Rule({
                    symbolizer: {
                        "Point": {
                            pointRadius: 4,
                            graphicName: "square",
                            fillColor: "white",
                            fillOpacity: 1,
                            strokeWidth: 1,
                            strokeOpacity: 1,
                            strokeColor: "#333333"
                        },
                        "Line": {
                            strokeWidth: 3,
                            strokeOpacity: 1,
                            strokeColor: "#666666",
                            strokeDashstyle: "dash"
                        },
                        "Polygon": {
                            strokeWidth: 2,
                            strokeOpacity: 1,
                            strokeColor: "#666666",
                            fillColor: "white",
                            fillOpacity: 0.3
                        }
                    }
                })]
            })
        });
        var cleanup = function() {
            if (measureToolTip) {
                measureToolTip.destroy();
            }
        };
        var makeString = function(metricData) {
            var metric = metricData.measure;
            var metricUnit = metricData.units;

            measureControl.displaySystem = "english";

            var englishData = metricData.geometry.CLASS_NAME.indexOf("LineString") > -1 ?
            measureControl.getBestLength(metricData.geometry) :
            measureControl.getBestArea(metricData.geometry);

            var english = englishData[0];
            var englishUnit = englishData[1];

            measureControl.displaySystem = "metric";
            var dim = metricData.order == 2 ?
            '<sup>2</sup>' :
            '';

            return metric.toFixed(2) + " " + metricUnit + dim + "<br>" +
                english.toFixed(2) + " " + englishUnit + dim;
        };

        var measureToolTip;
        var controlOptions = Ext.apply({}, this.initialConfig.controlOptions);
        Ext.applyIf(controlOptions, {
            geodesic: true,
            persist: true,
            handlerOptions: {layerOptions: {styleMap: styleMap}},
            eventListeners: {
                measurepartial: function(event) {
                    cleanup();
                    measureToolTip = Ext.create('Ext.tip.ToolTip', {
                        title: title,
                        autoHide: false,
                        closable: true,
                        draggable: false,
                        mouseOffset: [0, 0],
                        showDelay: 1,
                        listeners: {hide: cleanup},
                        html: makeString(event)
                    });
                    if(event.measure > 0) {
                        var px = measureControl.handler.lastUp;
                        var p0 = this.target.mapPanel.getPosition();
                        measureToolTip.targetXY = [p0[0] + px.x, p0[1] + px.y];
                        measureToolTip.show();
                    }
                },
                deactivate: cleanup,
                scope: this
            }
        });
        var measureControl = new OpenLayers.Control.Measure(handlerType,
            controlOptions);

        return measureControl;
    },
    addActions: function() {
        this.activeIndex = 0;
        this.button = Ext.create('Ext.SplitButton', {
            iconCls: "gxp-icon-measure-length",
            tooltip: this.measureTooltip,
            text: this.buttonText,
            enableToggle: true,
            toggleGroup: this.toggleGroup,
            allowDepress: true,
            handler: function(button, event) {
                if(button.pressed) {
                    button.menu.items.get(this.activeIndex).setChecked(true);
                }
            },
            scope: this,
            listeners: {
                toggle: function(button, pressed) {
                    // toggleGroup should handle this
                    if(!pressed) {
                        button.menu.items.each(function(i) {
                            i.setChecked(false);
                        });
                    }
                }
            },
            menu: Ext.create('Ext.menu.Menu', {
                items: [
                    Ext.create('Ext.menu.CheckItem',
                        Ext.create('GeoExt.Action', {
                            text: this.lengthMenuText,
                            iconCls: "gxp-icon-measure-length",
                            toggleGroup: this.toggleGroup,
                            group: this.toggleGroup,
                            listeners: {
                                checkchange: function(item, checked) {
                                    this.activeIndex = 0;
                                    this.button.toggle(checked);
                                    if (checked) {
                                        this.button.setIconCls(item.iconCls);
                                    }
                                },
                                scope: this
                            },
                            map: this.target.mapPanel.map,
                            control: this.createMeasureControl(
                                OpenLayers.Handler.Path, this.lengthTooltip
                            )
                        })
                    ),
                    Ext.create('Ext.menu.CheckItem',
                        Ext.create('GeoExt.Action', {
                            text: this.areaMenuText,
                            iconCls: "gxp-icon-measure-area",
                            toggleGroup: this.toggleGroup,
                            group: this.toggleGroup,
                            allowDepress: false,
                            listeners: {
                                checkchange: function(item, checked) {
                                    this.activeIndex = 1;
                                    this.button.toggle(checked);
                                    if (checked) {
                                        this.button.setIconCls(item.iconCls);
                                    }
                                },
                                scope: this
                            },
                            map: this.target.mapPanel.map,
                            control: this.createMeasureControl(
                                OpenLayers.Handler.Polygon, this.areaTooltip
                            )
                        })
                    )
                ]
            })
        });
        return gxp.plugins.Measure.superclass.addActions.apply(this, [this.button]);
    }
});
