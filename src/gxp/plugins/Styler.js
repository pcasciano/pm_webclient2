/**
 * @requires plugins/Tool.js
 * @requires container/WMSStylesDialog.js
 * @requires plugins/GeoServerStyleWriter.js
 * @requires plugins/WMSRasterStylesDialog.js
 */

Ext.define('gxp.plugins.Styler', {
    extend: 'gxp.plugins.Tool',
    alias: 'plugin.gxp_styler',
    menuText: "Edit Styles",
    tooltip: "Manage layer styles",
    roles: ["ROLE_ADMINISTRATOR"],
    sameOriginStyling: true,
    rasterStyling: false,
    requireDescribeLayer: true,
    constructor: function(config) {
        this.callParent(arguments);

        if (!this.outputConfig) {
            this.outputConfig = {
                autoHeight: true,
                width: 265
            };
        }
        Ext.applyIf(this.outputConfig, {
            closeAction: "close"
        });
    },
    init: function(target) {
        this.callParent(arguments);
        this.target.on("authorizationchange", this.enableOrDisable, this);
    },
    destroy: function() {
        this.target.un("authorizationchange", this.enableOrDisable, this);
        this.callParent(arguments);
    },
    enableOrDisable: function() {
        if (this.target && this.target.selectedLayer !== null) {
            this.handleLayerChange(this.target.selectedLayer);
        }
    },
    addActions: function() {
        var layerProperties;
        var actions = gxp.plugins.Styler.superclass.addActions.apply(this, [{
            menuText: this.menuText,
            iconCls: "gxp-icon-palette",
            disabled: true,
            tooltip: this.tooltip,
            handler: function() {
                this.target.doAuthorized(this.roles, this.addOutput, this);
            },
            scope: this
        }]);

        this.launchAction = actions[0];
        this.target.on({
            layerselectionchange: this.handleLayerChange,
            scope: this
        });

        return actions;
    },
    handleLayerChange: function(record) {
        this.launchAction.disable();
        if (record) {
            var source = this.target.getSource(record);
            if (source instanceof gxp.plugins.WMSSource) {
                source.describeLayer(record, function(describeRec) {
                    this.checkIfStyleable(record, describeRec);
                }, this);
            }
        }
    },
    checkIfStyleable: function(layerRec, describeRec) {
        if (describeRec) {
            var owsTypes = ["WFS"];
            if (this.rasterStyling === true) {
                owsTypes.push("WCS");
            }
        }
        if (describeRec ? owsTypes.indexOf(describeRec.get("owsType")) !== -1 : !this.requireDescribeLayer) {
            var editableStyles = false;
            var source = this.target.layerSources[layerRec.get("source")];
            var url;
            // TODO: revisit this
            var restUrl = layerRec.get("restUrl");
            if (restUrl) {
                url = restUrl + "/styles";
            } else {
                url = source.url.split("?")
                    .shift().replace(/\/(wms|ows)\/?$/, "/rest/styles");
            }
            if (this.sameOriginStyling) {
                // this could be made more robust
                // for now, only style for sources with relative url
                editableStyles = url.charAt(0) === "/";
                // and assume that local sources are GeoServer instances with
                // styling capabilities
                if (this.target.authenticate && editableStyles) {
                    // we'll do on-demand authentication when the button is
                    // pressed.
                    this.launchAction.enable();
                    return;
                }
            } else {
                editableStyles = true;
            }
            if (editableStyles) {
                if (this.target.isAuthorized()) {
                    // check if service is available
                    this.enableActionIfAvailable(url);
                }
            }
        }
    },
    enableActionIfAvailable: function(url) {
        Ext.Ajax.request({
            method: "PUT",
            url: url,
            callback: function(options, success, response) {
                // we expect a 405 error code here if we are dealing
                // with GeoServer and have write access.
                this.launchAction.setDisabled(response.status !== 405);
            },
            scope: this
        });
    },
    addOutput: function(config) {
        config = config || {};
        var record = this.target.selectedLayer;

        var origCfg = this.initialConfig.outputConfig || {};
        this.outputConfig.title = origCfg.title ||
            this.menuText + ": " + record.get("title");
        this.outputConfig.shortTitle = record.get("title");

        Ext.apply(config, gxp.container.WMSStylesDialog.createGeoServerStylerConfig(record));
        if (this.rasterStyling === true) {
            config.plugins.push({
                ptype: "gxp_wmsrasterstylesdialog"
            });
        }
        Ext.applyIf(config, {style: "padding: 10px"});

        var output = gxp.plugins.Styler.superclass.addOutput.call(this, config);
        if (!(output.ownerCt.ownerCt instanceof Ext.Window)) {
            output.dialogCls = Ext.Panel;
            output.showDlg = function(dlg) {
                dlg.layout = "fit";
                dlg.autoHeight = false;
                output.ownerCt.add(dlg);
            };
        }
        output.stylesStore.on("load", function() {
            if (!this.outputTarget && output.ownerCt.ownerCt instanceof Ext.Window) {
                output.ownerCt.ownerCt.center();
            }
        });
    }
});
