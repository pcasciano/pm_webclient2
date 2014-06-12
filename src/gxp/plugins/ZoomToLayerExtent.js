/**
 * @requires plugins/ZoomToExtent.js
 */

Ext.define('gxp.plugins.ZoomToLayerExtent', {
    extend: 'gxp.plugins.ZoomToExtent',
    alias: 'plugin.gxp_zoomtolayerextent',
    menuText: "Zoom to layer extent",
    tooltip: "Zoom to layer extent",
    iconCls: "gxp-icon-zoom-to",
    destroy: function() {
        this.selectedRecord = null;
        gxp.plugins.ZoomToLayerExtent.superclass.destroy.apply(this, arguments);
    },
    extent: function() {
        var layer = this.selectedRecord.getLayer(),
            dataExtent;
        if (OpenLayers.Layer.Vector) {
            dataExtent = layer instanceof OpenLayers.Layer.Vector &&
                layer.getDataExtent();
        }
        return layer.restrictedExtent || dataExtent || layer.maxExtent || map.maxExtent;
    },
    addActions: function() {
        var actions = gxp.plugins.ZoomToLayerExtent.superclass.addActions.apply(this, arguments);
        actions[0].disable();

        this.target.on("layerselectionchange", function(record) {
            this.selectedRecord = record;
            actions[0].setDisabled(
                !record || !record.raw instanceof OpenLayers.Layer
            );
        }, this);

        return actions;
    }

});
