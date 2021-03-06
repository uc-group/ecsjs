import Entity, { EntityID } from './Entity';
import View, { ComponentGroup } from './View';
import { RegistryListeners, RegistryListenerTypes } from './RegistryListeners';

export class Registry<Components = {}> {
    private entityComponents = new Map<EntityID, Set<keyof Components>>();

    private components = new Map();

    private nextEntity: EntityID = 1;

    private listeners: RegistryListeners<Components> = {
        componentAdded: [],
        componentRemoved: [],
        entityCreated: [],
        entityRemoved: []
    }

    private getComponentMap<T extends keyof Components>(componentName: T): Map<EntityID, Components[T]> 
    {
        if (!this.components.has(componentName)) {
            this.components.set(componentName, new Map<EntityID, Components[T]>())
        }
    
        return this.components.get(componentName)
    }

    public createEntity(): Entity<Components>
    {
        const entity = new Entity(this.nextEntity++, this)
        this.entityComponents.set(entity.id, new Set())

        this.listeners.entityCreated.forEach(listener => {
            listener(entity)
        })

        return entity
    }

    public hasComponent(entity: EntityID, name: keyof Components): boolean
    {
        return this.getComponentMap(name).has(entity)
    }

    public assignComponent<T extends keyof Components>(entity: EntityID, name: T, component: Components[T]): Components[T]
    {
        let componentList = this.entityComponents.get(entity)
        if (componentList) {
            componentList.add(name)
            this.getComponentMap(name).set(entity, component)
        }

        this.listeners.componentAdded.forEach(listener => {
            listener(new Entity(entity, this), name, component)
        })

        return component
    }

    public removeComponent(entity: EntityID, name: keyof Components): void
    {
        let componentList = this.entityComponents.get(entity)
        if (componentList) {
            const component = this.getComponent(entity, name)
            this.listeners.componentRemoved.forEach(listener => {
                listener(new Entity(entity, this), name, component)
            })

            componentList.delete(name)
        }
        this.getComponentMap(name).delete(entity)
    }

    public getComponent<T extends keyof Components>(entityId: EntityID, name: T): Components[T]
    {
        const component = this.getComponentMap(name).get(entityId)
        if (!component) {
            throw new Error(`Entity ${entityId} does not have component ${name}`)
        }

        return component
    }

    public removeEntity(entity: EntityID): void
    {
        let componentList = this.entityComponents.get(entity)
        if (!componentList) {
            return
        }

        this.listeners.entityRemoved.forEach(listener => {
            listener(new Entity(entity, this))
        })

        componentList.forEach(componentName => {
            this.removeComponent(entity, componentName)
        })
        this.entityComponents.delete(entity)
    }

    public getView(groupAll: ComponentGroup<Components>, groupAny: ComponentGroup<Components> = []): View<Components>
    {
        const view = new View(groupAll, groupAny)
        this.entityComponents.forEach((c, entityID) => {
            const componentArray = Array.from(c)
            const allComponents = groupAll.filter(e => componentArray.includes(e))
            if (allComponents.length !== groupAll.length) {
                return;
            }

            const entity = new Entity(entityID, this)
            const searchComponents = groupAny.filter(e => componentArray.includes(e)).concat(allComponents)
            searchComponents.forEach(componentName => {
                let component = this.getComponent(entityID, componentName)
                if (component) {
                    view.addComponent(entity, componentName, component)
                }
            })
        })

        return view
    }

    public registerListener<T extends keyof RegistryListenerTypes<Components>>(name: T, listener: RegistryListenerTypes<Components>[T]): void
    {
        (this.listeners[name] as RegistryListenerTypes<Components>[T][]).push(listener)
    }
}

const createRegistry = <Components>(): Registry<Components> => {
    return new Registry<Components>();
}

export default createRegistry;