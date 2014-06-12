/**
 * @requires plugins/Tool.js
 * @requires tab/WMSLayerPanel.js
 */

Ext.define('gxp.plugins.LayerProperties', {
    extend: 'gxp.plugins.Tool',
    alias: 'plugin.gxp_layerproperties',
    requires: ['gxp.tab.WMSLayerPanel'],
    menuText: "Layer Properties",
    toolTip: "Layer Properties",
    constructor: function(config) {
        this.callParent(arguments);
        if (!this.outputConfig) {
            this.outputConfig = {
                width: 325,
                autoHeight: true
            };
        }
    },
    addActions: function() {
        var actions = gxp.plugins.LayerProperties.superclass.addActions.apply(this, [{
            text: this.menuText,
            iconCls: "gxp-icon-layerproperties",
            disabled: true,
            tooltip: this.toolTip,
            handler: function() {
                this.removeOutput();
                this.addOutput();
            },
            scope: this
        }]);
        var layerPropertiesAction = actions[0];

        this.target.on("layerselectionchange", function(record) {
            layerPropertiesAction.setDisabled(
                !record || !record.get("properties")
            );
        }, this);
        return actions;
    },
    addOutput: function(config) {
        config = config || {};
        var record = this.target.selectedLayer;
        var origCfg = this.initialConfig.outputConfig || {};
        this.outputConfig.title = origCfg.title ||
            this.menuText + ": " + record.get("title");
        this.outputConfig.shortTitle = record.get("title");

        //TODO create generic gxp_layerpanel
        var xtype = record.get("properties") || "gxp_layerpanel";
        var panelConfig = this.layerPanelConfig;
        if (panelConfig && panelConfig[xtype]) {
            Ext.apply(config, panelConfig[xtype]);
        }
        var output = gxp.plugins.LayerProperties.superclass.addOutput.call(this, Ext.apply({
            xtype: xtype,
            authorized: this.target.isAuthorized(),
            layerRecord: record,
            source: this.target.getSource(record),
            defaults: {
                style: "padding: 10px",
                autoHeight: this.outputConfig.autoHeight
            }
        }, config));
        output.on({
            added: function(cmp) {
                if (!this.outputTarget) {
                    cmp.on("afterrender", function() {
                        cmp.ownerCt.ownerCt.center();
                    }, this, {single: true});
                }
            },
            scope: this
        });
        return output;
    }

});
