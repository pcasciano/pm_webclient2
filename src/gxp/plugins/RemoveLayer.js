/**
 * @requires plugins/Tool.js
 */

Ext.define('gxp.plugins.RemoveLayer', {
    extend: 'gxp.plugins.Tool',
    alias: 'plugin.gxp_removelayer',
    removeMenuText: "Remove layer",
    removeActionTip: "Remove layer",
    addActions: function() {
        var selectedLayer;
        var actions = gxp.plugins.RemoveLayer.superclass.addActions.call(this, [{
            text: this.removeMenuText,
            iconCls: "gxp-icon-removelayers",
            disabled: true,
            tooltip: this.removeActionTip,
            handler: function() {
                var record = selectedLayer;
                if(record) {
                    this.target.mapPanel.layers.remove(record);
                }
            },
            scope: this
        }]);
        var removeLayerAction = actions[0];

        this.target.on("layerselectionchange", function(record) {
            selectedLayer = record;
            removeLayerAction.setDisabled(
                this.target.mapPanel.layers.getCount() <= 1 || !record
            );
        }, this);
        var enforceOne = function(store) {
            removeLayerAction.setDisabled(
                !selectedLayer || store.getCount() <= 1
            );
        };
        this.target.mapPanel.layers.on({
            "add": enforceOne,
            "remove": enforceOne
        });

        return actions;

    }

});
