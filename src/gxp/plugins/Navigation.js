/**
 * @requires plugins/Tool.js
 * @include OpenLayers/Kinetic.js
 */

Ext.define('gxp.plugins.Navigation', {
    extend: 'gxp.plugins.Tool',
    requires: [
        'GeoExt.Action'
    ],
    alias: 'plugin.gxp_navigation',
    menuText: "Pan Map",
    tooltip: "Pan Map",
    addActions: function() {
        var control;
        // If no controlOptions are configured, try to find a Navigation
        // control on the target map.
        if (!this.controlOptions) {
            candidates = this.target.mapPanel.map.getControlsByClass('OpenLayers.Control.Navigation');
            if (candidates.length) {
                control = candidates[0];
            }
        } else {
            this.controlOptions = this.controlOptions || {};
            Ext.applyIf(this.controlOptions, {dragPanOptions: {enableKinetic: true}});
            control = new OpenLayers.Control.Navigation(this.controlOptions);
        }
        var actions = [Ext.create('GeoExt.Action', {
            tooltip: this.tooltip,
            menuText: this.menuText,
            iconCls: "gxp-icon-pan",
            enableToggle: true,
            pressed: true,
            allowDepress: false,
            control: control,
            map: control.map ? null : this.target.mapPanel.map,
            toggleGroup: this.toggleGroup
        })];
        return gxp.plugins.Navigation.superclass.addActions.apply(this, [actions]);
    }
});
