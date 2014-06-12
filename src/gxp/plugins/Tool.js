/**
 * @requires GeoExt/Action.js
 * @requires button/IconButton.js
 */

Ext.define('gxp.plugins.Tool', {
    alias: 'plugin.gxp_tool',
    requires: ['Ext.Action', 'GeoExt.Action', 'gxp.button.IconButton'],
    actionTarget: "map.tbar",
    showButtonText: false,
    autoActivate: true,
    output: null,
    mixins: {
        observable: 'Ext.util.Observable'
    },
    constructor: function(config) {
        this.initConfig(config);
        this.mixins.observable.constructor.call(this, config);
        this.addEvents('activate', 'deactivate');
        this.active = false;
        if (!this.id) {
            this.id = Ext.id();
        }
        this.output = [];
    },
    init: function(target) {
        target.tools[this.id] = this;
        this.target = target;
        this.autoActivate && this.activate();
        this.target.on("portalready", this.addActions, this);
    },
    activate: function() {
        if (this.active === false) {
            this.active = true;
            this.fireEvent("activate", this);
            return true;
        }
    },
    deactivate: function() {
        if (this.active === true) {
            this.active = false;
            this.fireEvent("deactivate", this);
            return true;
        }
    },
    getContainer: function(target) {
        var ct, item, meth,
            parts = target.split("."),
            ref = parts[0];
	  // console.log(parts);
        if (ref) {
            if (ref == "map") {
                ct = this.target.mapPanel;
            } else {
                ct = Ext.getCmp(ref) || this.target.portal[ref];
                if (!ct) {
                    throw new Error("Can't find component with id: " + ref);
                }
            }
        } else {
            ct = this.target.portal;
        }
        item = parts.length > 1 && parts[1];
        if (item) {
            meth = {
                "tbar": 'toolbar[dock=top]',
                "bbar": 'toolbar[dock=bottom]'
            }[item];
            if (meth) {
                ct = ct.getDockedItems(meth)[0];
            } else {
                ct = ct[item];
            }
        }
        return ct;
    },
    addActions: function(actions) {
        actions = actions || this.actions;
        if (!actions || this.actionTarget === null) {
            // add output immediately if we have no actions to trigger it
            this.addOutput();
            return;
        }

        var actionTargets = this.actionTarget instanceof Array ?
            this.actionTarget : [this.actionTarget];
        var a = actions instanceof Array ? actions : [actions];
        var action, actionTarget, cmp, i, j, jj, ct, index = null;
        var menuTarget = null;
        for (i=actionTargets.length-1; i>=0; --i) {
            actionTarget = actionTargets[i];
            if (actionTarget) {
                if (actionTarget instanceof Object) {
                    index = actionTarget.index;
                    actionTarget = actionTarget.target;
                }
                if (actionTarget.indexOf('contextMenu') !== -1) {
                  menuTarget = actionTarget.split('.')[0];
                  if (!this.target.menus[menuTarget]) {
                      this.target.menus[menuTarget] = Ext.create('Ext.menu.Menu');
                  }
                  Ext.getCmp(menuTarget).on('itemcontextmenu', function(view, record, item, index, event, options) {
                      event.preventDefault();
                      this.target.menus[menuTarget].showAt(event.getXY());
                  }, this);
                } 
                ct = this.getContainer(actionTarget);
            }
            for (j=0, jj=a.length; j<jj; ++j) {
                if (!(a[j] instanceof Ext.Action || a[j] instanceof Ext.Component)) {
                    cmp = Ext.getCmp(a[j]);
                    if (cmp) {
                        a[j] = cmp;
                    }
                    if (typeof a[j] != "string") {
                        if (j == this.defaultAction) {
                            a[j].pressed = true;
                        }
                        a[j] = Ext.create('Ext.Action', a[j]);
                    }
                }
                action = a[j];
                if (menuTarget !== null) {
                    this.target.menus[menuTarget].add(action);
                }
                if (j == this.defaultAction && action instanceof GeoExt.Action) {
                    action.isDisabled() ?
                        action.activateOnEnable = true :
                        action.control.activate();
                }
                if (ct) {
                    if (ct instanceof Ext.menu.Menu) {
                        action = Ext.apply(Ext.create('Ext.menu.CheckItem', action), {
                            text: action.initialConfig.menuText,
                            group: action.initialConfig.toggleGroup,
                            groupClass: null
                        });
                    } else {
                        if (!Ext.isString(action)) {
                            if (this.showButtonText) {
                                if (!(action instanceof Ext.Button)) {
                                    action = Ext.create('Ext.Button', action);
                                }
                            } else {
                                action = Ext.create('gxp.button.IconButton', action);
                            }
                        }
                    }
                    var addedAction = (index === null) ? ct.add(action) : ct.insert(index, action);
                    action = action instanceof Ext.Button ? action : addedAction;
                    if (index !== null) {
                        index += 1;
                    }
                    if (this.outputAction != null && j == this.outputAction) {
                        var cmp;
                        action.on("click", function() {
                            if (cmp) {
                                this.outputTarget ?
                                    cmp.show() : cmp.ownerCt.ownerCt.show();
                            } else {
                                cmp = this.addOutput();
                            }
                        }, this);
                    }
                }
            }
            // call ct.show() in case the container was previously hidden (e.g.
            // the mapPanel's bbar or tbar which are initially hidden)
            if (ct) {
                ct.isVisible() ?
                    ct.doLayout() : ct instanceof Ext.menu.Menu || ct.show();
            }
        }
        this.actions = a;
        return this.actions;
    },
    addOutput: function(config) {
        if (!config && !this.outputConfig) {
            // nothing to do here for tools that don't have any output
            return;
        }

        config = config || {};
        var ref = this.outputTarget;
        var container;
        if (ref) {
            container = this.getContainer(ref);
            if (!(config instanceof Ext.Component)) {
                Ext.apply(config, this.outputConfig);
            }
        } else {
            var outputConfig = this.outputConfig || {};
            container = Ext.Create('Ext.Window', Ext.apply({
                hideBorders: true,
                shadow: false,
                closeAction: "hide",
                autoHeight: !outputConfig.height,
                layout: outputConfig.height ? "fit" : undefined,
                items: [{
                    defaults: Ext.applyIf({
                        autoHeight: !outputConfig.height && !(outputConfig.defaults && outputConfig.defaults.height)
                    }, outputConfig.defaults)
                }]
            }, outputConfig)).show().items.get(0);
        }
        if (container) {
            var component = container.add(config);
            component.on("removed", function(cmp) {
                Ext.Array.remove(this.output, cmp);
            }, this, {single: true});
            if (component instanceof Ext.Window) {
                component.show();
            } else {
                container.doLayout();
            }
            this.output.push(component);
            return component;
        } else {
            var ptype = this.ptype;
            if (window.console) {
                console.error("Failed to create output for plugin with ptype: " + ptype);
            }
        }
    },
    removeOutput: function() {
        var cmp;
        for (var i=this.output.length-1; i>=0; --i) {
            cmp = this.output[i];
            if (!this.outputTarget) {
                cmp.findParentBy(function(p) {
                    return p instanceof Ext.Window;
                }).close();
            } else {
                if (cmp.ownerCt) {
                    cmp.ownerCt.remove(cmp);
                    if (cmp.ownerCt instanceof Ext.Window) {
                        cmp.ownerCt[cmp.ownerCt.closeAction]();
                    }
                } else {
                    cmp.remove();
                }
            }
        }
        this.output = [];
    },
    getState: function(){
        return Ext.apply({}, this.initialConfig);
    }
});

