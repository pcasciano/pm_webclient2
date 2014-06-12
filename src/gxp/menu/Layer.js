Ext.define('gxp.menu.Layer', {
    extend: 'Ext.menu.Menu',
    alias: 'widget.gxp_layermenu',
    layerText: "Layer",
    layers: null,
    initComponent: function() {
        this.callParent(arguments);
        this.layers.on("add", this.onLayerAdd, this);
        this.onLayerAdd();
    },
    beforeDestroy: function() {
        if (this.layers && this.layers.on) {
            this.layers.un("add", this.onLayerAdd, this);
        }
        delete this.layers;
        this.callParent(arguments);
    },
    onLayerAdd: function() {
        this.removeAll();
        this.add(
            {
                iconCls: "gxp-layer-visibility",
                text: this.layerText,
                canActivate: false
            },
            "-"
        );
        this.layers.each(function(record) {
            var layer = record.getLayer();
            if(layer.displayInLayerSwitcher) {
                var item = Ext.create('Ext.menu.CheckItem', {
                    text: record.get("title"),
                    checked: record.getLayer().getVisibility(),
                    group: record.get("group"),
                    listeners: {
                        checkchange: function(item, checked) {
                            record.getLayer().setVisibility(checked);
                        }
                    }
                });
                if (this.items.getCount() > 2) {
                    this.insert(2, item);
                } else {
                    this.add(item);
                }
            }
        }, this);
    }
});
