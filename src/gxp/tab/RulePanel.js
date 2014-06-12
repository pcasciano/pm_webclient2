/**
 * @requires panel/ScaleLimit.js
 * @requires panel/TextSymbolizer.js
 * @requires panel/PolygonSymbolizer.js
 * @requires panel/LineSymbolizer.js
 * @requires panel/PointSymbolizer.js
 * @requires container/FilterBuilder.js
 * @requires GeoExt/FeatureRenderer.js
 */

Ext.define('gxp.tab.RulePanel', {
    extend: 'Ext.tab.Panel',
    alias: 'widget.gxp_rulepanel',
    requires: ['GeoExt.FeatureRenderer', 'gxp.panel.PolygonSymbolizer', 'gxp.panel.LineSymbolizer', 'gxp.panel.PointSymbolizer', 'gxp.panel.TextSymbolizer', 'gxp.panel.ScaleLimit', 'gxp.container.FilterBuilder'],
    fonts: undefined,
    symbolType: "Point",
    rule: null,
    attributes: null,
    nestedFilters: true,
    minScaleDenominatorLimit: Math.pow(0.5, 19) * 40075016.68 * 39.3701 * OpenLayers.DOTS_PER_INCH / 256,
    maxScaleDenominatorLimit: 40075016.68 * 39.3701 * OpenLayers.DOTS_PER_INCH / 256,
    scaleLevels: 20,
    scaleSliderTemplate: "{scaleType} Scale 1:{scale}",
    modifyScaleTipContext: Ext.emptyFn,
    labelFeaturesText: "Label Features",
    labelsText: "Labels",
    basicText: "Basic",
    advancedText: "Advanced",
    limitByScaleText: "Limit by scale",
    limitByConditionText: "Limit by condition",
    symbolText: "Symbol",
    nameText: "Name",
    initComponent: function() {

        var defConfig = {
            plain: true,
            border: false
        };
        Ext.applyIf(this, defConfig);

        if(!this.rule) {
            this.rule = new OpenLayers.Rule({
                name: this.uniqueRuleName()
            });
        } else {
            if (!this.initialConfig.symbolType) {
                this.symbolType = this.getSymbolTypeFromRule(this.rule) || this.symbolType;
            }
        }

        this.activeTab = 0;

        this.textSymbolizer = Ext.create('gxp.panel.TextSymbolizer', {
            symbolizer: this.getTextSymbolizer(),
            attributes: this.attributes,
            fonts: this.fonts,
            listeners: {
                change: function(symbolizer) {
                    this.fireEvent("change", this, this.rule);
                },
                scope: this
            }
        });

        /**
         * The interpretation here is that scale values of zero are equivalent to
         * no scale value.  If someone thinks that a scale value of zero should have
         * a different interpretation, this needs to be changed.
         */
        this.scaleLimitPanel = Ext.create('gxp.panel.ScaleLimit', {
            maxScaleDenominator: this.rule.maxScaleDenominator || undefined,
            limitMaxScaleDenominator: !!this.rule.maxScaleDenominator,
            maxScaleDenominatorLimit: this.maxScaleDenominatorLimit,
            minScaleDenominator: this.rule.minScaleDenominator || undefined,
            limitMinScaleDenominator: !!this.rule.minScaleDenominator,
            minScaleDenominatorLimit: this.minScaleDenominatorLimit,
            scaleLevels: this.scaleLevels,
            scaleSliderTemplate: this.scaleSliderTemplate,
            modifyScaleTipContext: this.modifyScaleTipContext,
            listeners: {
                change: function(comp, min, max) {
                    this.rule.minScaleDenominator = min;
                    this.rule.maxScaleDenominator = max;
                    this.fireEvent("change", this, this.rule);
                },
                scope: this
            }
        });

        this.filterBuilder = Ext.create('gxp.container.FilterBuilder', {
            allowGroups: this.nestedFilters,
            filter: this.rule && this.rule.filter && this.rule.filter.clone(),
            attributes: this.attributes,
            listeners: {
                change: function(builder) {
                    var filter = builder.getFilter();
                    this.rule.filter = filter;
                    this.fireEvent("change", this, this.rule);
                },
                scope: this
            }
        });
        this.items = [{
            title: this.labelsText,
            autoScroll: true,
            bodyStyle: {"padding": "10px"},
            items: [{
                xtype: "fieldset",
                title: this.labelFeaturesText,
                autoHeight: true,
                checkboxToggle: true,
                collapsed: !this.hasTextSymbolizer(),
                items: [
                    this.textSymbolizer
                ],
                listeners: {
                    collapse: function() {
                        OpenLayers.Util.removeItem(this.rule.symbolizers, this.getTextSymbolizer());
                        this.fireEvent("change", this, this.rule);
                    },
                    expand: function() {
                        this.setTextSymbolizer(this.textSymbolizer.symbolizer);
                        this.fireEvent("change", this, this.rule);
                    },
                    scope: this
                }
            }]
        }];
        if (this.getSymbolTypeFromRule(this.rule) || this.symbolType) {
            this.items = [{
                title: this.basicText,
                autoScroll: true,
                items: [this.createHeaderPanel(), this.createSymbolizerPanel()]
            }, this.items[0], {
                title: this.advancedText,
                defaults: {
                    style: {
                        margin: "7px"
                    }
                },
                autoScroll: true,
                items: [{
                    xtype: "fieldset",
                    title: this.limitByScaleText,
                    checkboxToggle: true,
                    collapsed: !(this.rule && (this.rule.minScaleDenominator || this.rule.maxScaleDenominator)),
                    autoHeight: true,
                    items: [this.scaleLimitPanel],
                    listeners: {
                        collapse: function() {
                            delete this.rule.minScaleDenominator;
                            delete this.rule.maxScaleDenominator;
                            this.fireEvent("change", this, this.rule);
                        },
                        expand: function() {
                            /**
                             * Start workaround for
                             * http://projects.opengeo.org/suite/ticket/676
                             */
                            var tab = this.getActiveTab();
                            this.activeTab = null;
                            this.setActiveTab(tab);
                            /**
                             * End workaround for
                             * http://projects.opengeo.org/suite/ticket/676
                             */
                            var changed = false;
                            if (this.scaleLimitPanel.limitMinScaleDenominator) {
                                this.rule.minScaleDenominator = this.scaleLimitPanel.minScaleDenominator;
                                changed = true;
                            }
                            if (this.scaleLimitPanel.limitMaxScaleDenominator) {
                                this.rule.maxScaleDenominator = this.scaleLimitPanel.maxScaleDenominator;
                                changed = true;
                            }
                            if (changed) {
                                this.fireEvent("change", this, this.rule);
                            }
                        },
                        scope: this
                    }
                }, {
                    xtype: "fieldset",
                    title: this.limitByConditionText,
                    checkboxToggle: true,
                    collapsed: !(this.rule && this.rule.filter),
                    autoHeight: true,
                    items: [this.filterBuilder],
                    listeners: {
                        collapse: function(){
                            delete this.rule.filter;
                            this.fireEvent("change", this, this.rule);
                        },
                        expand: function(){
                            var changed = false;
                            this.rule.filter = this.filterBuilder.getFilter();
                            this.fireEvent("change", this, this.rule);
                        },
                        scope: this
                    }
                }]
            }];
        }
        this.items[0].autoHeight = true;

        this.addEvents(
            /** api: events[change]
             *  Fires when any rule property changes.
             *
             *  Listener arguments:
             *  * panel - :class:`gxp.RulePanel` This panel.
             *  * rule - ``OpenLayers.Rule`` The updated rule.
             */
            "change"
        );

        this.on({
            tabchange: function(panel, tab) {
                tab.doLayout();
            },
            scope: this
        });
        this.callParent(arguments);
    },
    hasTextSymbolizer: function() {
        var candidate, symbolizer;
        for (var i=0, ii=this.rule.symbolizers.length; i<ii; ++i) {
            candidate = this.rule.symbolizers[i];
            if (candidate instanceof OpenLayers.Symbolizer.Text) {
                symbolizer = candidate;
                break;
            }
        }
        return symbolizer;
    },
    getTextSymbolizer: function() {
        var symbolizer = this.hasTextSymbolizer();
        if (!symbolizer) {
            symbolizer = new OpenLayers.Symbolizer.Text({graphic: false});
        }
        return symbolizer;
    },
    setTextSymbolizer: function(symbolizer) {
        var found;
        for (var i=0, ii=this.rule.symbolizers.length; i<ii; ++i) {
            candidate = this.rule.symbolizers[i];
            if (this.rule.symbolizers[i] instanceof OpenLayers.Symbolizer.Text) {
                this.rule.symbolizers[i] = symbolizer;
                found = true;
                break;
            }
        }
        if (!found) {
            this.rule.symbolizers.push(symbolizer);
        }
    },
    uniqueRuleName: function() {
        return OpenLayers.Util.createUniqueID("rule_");
    },
    createHeaderPanel: function() {
        this.symbolizerSwatch = Ext.create('GeoExt.FeatureRenderer', {
            symbolType: this.symbolType,
            isFormField: true,
            isValid: OpenLayers.Function.True,
            fieldLabel: this.symbolText
        });
        return {
            xtype: "form",
            border: false,
            labelAlign: "top",
            defaults: {border: false},
            style: {"padding": "0.3em 0 0 1em"},
            items: [{
                layout: "column",
                defaults: {
                    border: false,
                    style: {"padding-right": "1em"}
                },
                items: [{
                    layout: "form",
                    columnWidth: 0.8,
                    items: [{
                        xtype: "textfield",
                        fieldLabel: this.nameText,
                        value: this.rule && (this.rule.title || this.rule.name || ""),
                        listeners: {
                            change: function(el, value) {
                                this.rule.title = value;
                                this.fireEvent("change", this, this.rule);
                            },
                            scope: this
                        }
                    }]
                }, {
                    layout: "form",
                    columnWidth: 0.2,
                    items: [this.symbolizerSwatch]
                }]
            }]
        };
    },
    createSymbolizerPanel: function() {
        // use first symbolizer that matches symbolType
        var candidate, symbolizer;
        var Type = OpenLayers.Symbolizer[this.symbolType];
        var existing = false;
        if (Type) {
            for (var i=0, ii=this.rule.symbolizers.length; i<ii; ++i) {
                candidate = this.rule.symbolizers[i];
                if (candidate instanceof Type) {
                    existing = true;
                    symbolizer = candidate;
                    break;
                }
            }
            if (!symbolizer) {
                // allow addition of new symbolizer
                symbolizer = new Type({fill: false, stroke: false});
            }
        } else {
            throw new Error("Appropriate symbolizer type not included in build: " + this.symbolType);
        }
        this.symbolizerSwatch.setSymbolizers([symbolizer],
            {draw: this.symbolizerSwatch.rendered}
        );
        var cfg = {
            xtype: "gxp_" + this.symbolType.toLowerCase() + "symbolizer",
            symbolizer: symbolizer,
            bodyStyle: {padding: "10px"},
            border: false,
            labelWidth: 70,
            defaults: {
                labelWidth: 70
            },
            listeners: {
                change: function(symbolizer) {
                    this.symbolizerSwatch.setSymbolizers(
                        [symbolizer], {draw: this.symbolizerSwatch.rendered}
                    );
                    if (!existing) {
                        this.rule.symbolizers.push(symbolizer);
                        existing = true;
                    }
                    this.fireEvent("change", this, this.rule);
                },
                scope: this
            }
        };
        if (this.symbolType === "Point" && this.pointGraphics) {
            cfg.pointGraphics = this.pointGraphics;
        }
        return cfg;

    },
    getSymbolTypeFromRule: function(rule) {
        var candidate, type;
        for (var i=0, ii=rule.symbolizers.length; i<ii; ++i) {
            candidate = rule.symbolizers[i];
            if (!(candidate instanceof OpenLayers.Symbolizer.Text)) {
                type = candidate.CLASS_NAME.split(".").pop();
                break;
            }
        }
        return type;
    }
});
