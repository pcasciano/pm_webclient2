/**
 * @requires plugins/Tool.js
 * @requires GeoExt/tree/Panel.js
 * @requires GeoExt/data/LayerTreeModel.js
 * @requires GeoExt/tree/LayerContainer.js
 */

Ext.define('gxp.plugins.LayerTree', {
    extend: 'gxp.plugins.Tool',
    requires: [
        'GeoExt.tree.Panel',
        'Ext.data.TreeStore',
        'GeoExt.data.LayerTreeModel',
        'GeoExt.tree.LayerContainer'
    ],
    alias: 'plugin.gxp_layertree',
    shortTitle: "Layers",
    rootNodeText: "Layers",
    overlayNodeText: "Overlays",
    baseNodeText: "Base Layers",
    init: function(target) {
        this.callParent(arguments);
        this.store = Ext.create('Ext.data.TreeStore', {
            model: 'GeoExt.data.LayerTreeModel',
            root: {
                expanded: true,
                text: this.rootNodeText,
                children: [{
                    expanded: true,
                    text: this.overlayNodeText,
                    plugins: [{
                        ptype: 'gx_layercontainer',
                        loader: {
                            filter: function(record) {
                                var layer = record.getLayer();
                                return layer.displayInLayerSwitcher && record.get('group') !== 'background';
                            }
                        }
                    }]
                }, {
                    plugins: [{
                        ptype: 'gx_layercontainer',
                        loader: {
                            baseAttrs: {
                                checkedGroup: "background"
                            },
                            filter: function(record) {
                                var layer = record.getLayer();
                                return layer.displayInLayerSwitcher && record.get('group') === 'background';
                            }
                        }
                    }],
                    expanded: true,
                    text: this.baseNodeText
                }]
            }
        });
    },
    handleSelectionChange: function(sm, selected) {
        var record = selected[0];
        if (record) {
            this.target.mapPanel.layers.each(function(rec) {
                if (rec.getLayer() === record.get('layer')) {
                    this.target.selectLayer(rec);
                }
            }, this);
        }
    },
    addOutput: function(config) {
        config = Ext.apply(this.createOutputConfig(), config || {});
        var output = this.callParent([config]);
        output.on({
            selectionchange: {fn: this.handleSelectionChange},
            itemcontextmenu: {fn: this.handleTreeContextMenu},
            beforemovenode: {fn: this.handleBeforeMoveNode},
            scope: this
        });
        return output;
    },
    createOutputConfig: function() {
        // TODO restore all of the old functionality
        return {
            xtype: 'gx_treepanel',
            rootVisible: false,
            store: this.store
        };
    }
});
