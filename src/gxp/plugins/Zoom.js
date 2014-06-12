/**
 * @requires plugins/Tool.js
 * @include OpenLayers/Control/ZoomBox.js
 * @include GeoExt/Action.js
 */

Ext.define('gxp.plugins.Zoom', {
    extend: 'gxp.plugins.Tool',
    requires: [
        'GeoExt.Action'
    ],
    alias: 'plugin.gxp_zoom',
    zoomMenuText: "Zoom Box",
    zoomInMenuText: "Zoom In",
    zoomOutMenuText: "Zoom Out",
    zoomTooltip: "Zoom by dragging a box",
    zoomInTooltip: "Zoom in",
    zoomOutTooltip: "Zoom out",
    addActions: function() {
        var actions = [{
            menuText: this.zoomInMenuText,
            iconCls: "gxp-icon-zoom-in",
            tooltip: this.zoomInTooltip,
            handler: function() {
                this.target.mapPanel.map.zoomIn();
            },
            scope: this
        }, {
            menuText: this.zoomOutMenuText,
            iconCls: "gxp-icon-zoom-out",
            tooltip: this.zoomOutTooltip,
            handler: function() {
                this.target.mapPanel.map.zoomOut();
            },
            scope: this
        }];
        if (this.showZoomBoxAction) {
            actions.unshift(Ext.create("GeoExt.Action", {
                menuText: this.zoomText,
                iconCls: "gxp-icon-zoom",
                tooltip: this.zoomTooltip,
                control: new OpenLayers.Control.ZoomBox(this.controlOptions),
                map: this.target.mapPanel.map,
                enableToggle: true,
                allowDepress: false,
                toggleGroup: this.toggleGroup
            }));
        }
        return gxp.plugins.Zoom.superclass.addActions.call(this, actions);
    }
});
