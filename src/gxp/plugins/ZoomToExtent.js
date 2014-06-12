/**
 * @requires plugins/Tool.js
 */

Ext.define('gxp.plugins.ZoomToExtent', {
    extend: 'gxp.plugins.Tool',
    alias: 'plugin.gxp_zoomtoextent',
    menuText: "Zoom To Max Extent",
    tooltip: "Zoom To Max Extent",
    extent: null,
    closest: true,
    iconCls: "gxp-icon-zoomtoextent",
    constructor: function(config) {
        gxp.plugins.ZoomToExtent.superclass.constructor.call(this, config);
        if (this.extent instanceof Array) {
            this.extent = OpenLayers.Bounds.fromArray(this.extent);
        }
    },
    addActions: function() {
        var actions = gxp.plugins.ZoomToExtent.superclass.addActions.call(this, [{
            text: this.menuText,
            iconCls: this.iconCls,
            tooltip: this.tooltip,
            handler: function() {
                var map = this.target.mapPanel.map;
                var extent = typeof this.extent == "function" ? this.extent() : this.extent;
                if (!extent) {
                    // determine visible extent
                    var layer, extended;
                    for (var i=0, len=map.layers.length; i<len; ++i) {
                        layer = map.layers[i];
                        if (layer.getVisibility()) {
                            extended = layer.restrictedExtent || layer.maxExtent;
                            if (extent) {
                                extent.extend(extended);
                            } else if (extended) {
                                extent = extended.clone();
                            }
                        }
                    }
                }
                if (extent) {
                    // respect map properties
                    var restricted = map.restrictedExtent || map.maxExtent;
                    if (restricted) {
                        extent = new OpenLayers.Bounds(
                            Math.max(extent.left, restricted.left),
                            Math.max(extent.bottom, restricted.bottom),
                            Math.min(extent.right, restricted.right),
                            Math.min(extent.top, restricted.top)
                        );
                    }
                    map.zoomToExtent(extent, this.closest);
                }
            },
            scope: this
        }]);
        return actions;
    }

});
