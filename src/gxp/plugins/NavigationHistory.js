/**
 * @requires plugins/Tool.js
 * @include OpenLayers/Control/NavigationHistory.js
 */

Ext.define('gxp.plugins.NavigationHistory', {
    extend: 'gxp.plugins.Tool',
    requires: [
        'GeoExt.Action'
    ],
    alias: 'plugin.gxp_navigationhistory',
    previousMenuText: "Zoom To Previous Extent",
    nextMenuText: "Zoom To Next Extent",
    previousTooltip: "Zoom To Previous Extent",
    nextTooltip: "Zoom To Next Extent",
    addActions: function() {
        var historyControl = new OpenLayers.Control.NavigationHistory();
        this.target.mapPanel.map.addControl(historyControl);
        var actions = [Ext.create('GeoExt.Action', {
            menuText: this.previousMenuText,
            iconCls: "gxp-icon-zoom-previous",
            tooltip: this.previousTooltip,
            disabled: true,
            control: historyControl.previous
        }), Ext.create('GeoExt.Action', {
            menuText: this.nextMenuText,
            iconCls: "gxp-icon-zoom-next",
            tooltip: this.nextTooltip,
            disabled: true,
            control: historyControl.next
        })];
        return gxp.plugins.NavigationHistory.superclass.addActions.apply(this, [actions]);
    }
});
