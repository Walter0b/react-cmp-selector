import React, {
    ReactElement,
    ReactNode,
    cloneElement,
    isValidElement,
    useMemo,
    useCallback,
    useEffect
} from 'react';

/**
 * Configuration options for finding and modifying React components
 * @template P - Props type of the target component
 */
export interface ComponentFinderProps<P = unknown> {
    /** React children to search through */
    children: ReactNode;
    /** HTML attribute name to search for (default: 'data-slot') */
    attribute?: string;
    /** Attribute value to match */
    value?: string;
    /** Props to merge into the found component */
    props?: Partial<P>;
    /** Enable debug logging */
    debug?: boolean;
    /** Find all matching components */
    findAll?: boolean;
    /** Callback triggered when component is found */
    onFound?: (component: ReactElement) => void;
    /** Merge strategy for function props */
    functionPropMerge?: 'combine' | 'override';
}

/**
 * Custom React hook for finding components by attribute with enhanced capabilities
 * 
 * @remarks
 * This hook provides advanced component searching with prop merging, debug capabilities,
 * and support for complex React trees. It's ideal for component injection patterns.
 * 
 * @template P - Props type of the target component
 * @param options - Configuration options for the finder
 * @returns Found component(s) or null
 * 
 * @example
 * // Find and modify a header component
 * const header = getCmpByAttr({
 *   value: 'header',
 *   props: { className: 'sticky-header' }
 * });
 * 
 * @example
 * // Find all matching buttons with combined click handlers
 * const buttons = getCmpByAttr({
 *   attribute: 'data-role',
 *   value: 'action-button',
 *   findAll: true,
 *   functionPropMerge: 'combine'
 * });
 */
export function getCmpByAttr<P = unknown>({
    children,
    attribute = 'data-slot',
    value = '',
    props = {},
    debug = false,
    findAll = false,
    onFound,
    functionPropMerge = 'combine'
}: ComponentFinderProps<P>): ReactNode | ReactNode[] | null {
    const propsRef = useMemo(() => props, [props]);

    const mergeProps = useCallback((
        original: Record<string, unknown>,
        newProps: Record<string, unknown>
    ) => {
        const merged = { ...original };

        for (const [key, val] of Object.entries(newProps)) {
            const existingProp = merged[key];

            if (functionPropMerge === 'combine' &&
                typeof existingProp === 'function' &&
                typeof val === 'function') {
                merged[key] = (...args: unknown[]) => {
                    existingProp(...args);
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
                    (val as Function)(...args);
                };
            } else {
                merged[key] = val;
            }
        }

        return merged;
    }, [functionPropMerge]);

    const searchChildren = useCallback((nodes: ReactNode): ReactElement[] => {
        const matches: ReactElement[] = [];

        const walkTree = (node: ReactNode) => {
            if (!isValidElement(node)) return;

            const element = node as ReactElement;
            const elementProps = element.props as Record<string, unknown>;

            // Check current element
            if (elementProps[attribute] === value) {
                matches.push(element);
                onFound?.(element);
            }

            // Recursively search children
            if (elementProps.children) {
                React.Children.forEach(elementProps.children as ReactNode, walkTree);
            }
        };

        React.Children.forEach(nodes, walkTree);

        return matches;
    }, [attribute, value, onFound]);

    const foundComponents = useMemo(() => searchChildren(children), [children, searchChildren]);

    useEffect(() => {
        if (debug && process.env.NODE_ENV !== 'production') {
            console.groupCollapsed(`[Component Finder] ${attribute}="${value}"`);
            console.log('Search Parameters:', { attribute, value });
            console.log('Matches Found:', foundComponents.length);
            console.log('Components:', foundComponents);
            console.groupEnd();
        }
    }, [debug, foundComponents, attribute, value]);

    return useMemo(() => {
        if (foundComponents.length === 0) {
            if (debug && process.env.NODE_ENV !== 'production') {
                console.warn(
                    `No components found with ${attribute}="${value}".\nAvailable attributes:`,
                    React.Children.toArray(children)
                        .filter(isValidElement)
                        .flatMap(c => Object.entries((c.props as Record<string, unknown>))
                            .filter(([k]) => k.startsWith('data-'))
                            .map(([k, v]) => `${k}: ${v}`)
                        ),
                );
            }
            return null;
        }

        const processComponent = (component: ReactElement) => {
            try {
                return cloneElement(
                    component,
                    mergeProps(
                        component.props as Record<string, unknown>,
                        propsRef as Record<string, unknown>
                    )
                );
            } catch (error) {
                if (process.env.NODE_ENV !== 'production') {
                    console.error('Component cloning error:', error);
                }
                return component;
            }
        };

        const result = findAll
            ? foundComponents.map(processComponent)
            : processComponent(foundComponents[0]);

        return result;
    }, [foundComponents, propsRef, debug, findAll, attribute, value, mergeProps]);
}

/**
 * Props for the Slot component
 * @template P - Props type of the slotted component
 */
export interface SlotProps<P = unknown> extends Omit<ComponentFinderProps<P>, 'value' | 'findAll' | 'onFound'> {
    /** Slot identifier to search for */
    name: string;
    /** Fallback content when no slot is found */
    fallback?: ReactNode;
}

/**
 * Declarative component version of getCmpByAttr
 * 
 * @remarks
 * Provides a React component interface for the slot finding functionality
 * with additional validation and fallback capabilities.
 * 
 * @example
 * <Slot name="header" fallback={<DefaultHeader />}>
 *   {children}
 * </Slot>
 */
export function Slot<P = unknown>({
    children,
    name,
    attribute = 'data-slot',
    props = {},
    debug = false,
    fallback = null,
    functionPropMerge = 'combine'
}: SlotProps<P>) {
    const component = getCmpByAttr({
        children,
        attribute,
        value: name,
        props,
        debug,
        functionPropMerge
    });

    return component || fallback;
}

/**
 * Utility functions for working with slots
 */
export const SlotUtils = {
    /**
     * Creates a slot marker component for type-safe slot declaration
     * 
     * @param name - Slot identifier
     * @param attribute - Attribute name to use (default: 'data-slot')
     * @returns Slot marker component
     * 
     * @example
     * const HeaderSlot = SlotUtils.createMarker('header');
     * <HeaderSlot>...</HeaderSlot>
     */
    createMarker: (name: string, attribute: string = 'data-slot') => {
        return ({ children, ...props }: { children?: ReactNode } & Record<string, unknown>) =>
            React.createElement(
                'div',
                {
                    ...props,
                    style: { display: 'contents', ...(typeof props.style === 'object' && props.style !== null ? props.style : {}) },
                    [attribute]: name
                },
                children
            );
    },

    /**
     * Validates required slots in development environment
     * 
     * @param children - Component children to validate
     * @param requiredSlots - Array of required slot names
     * @param attribute - Attribute name to check (default: 'data-slot')
     */
    validate: (children: ReactNode, requiredSlots: string[], attribute = 'data-slot') => {
        if (process.env.NODE_ENV === 'development') {
            const presentSlots = React.Children.toArray(children)
                .filter(isValidElement)
                .map(child => (child.props as Record<string, unknown>)[attribute])
                .filter(Boolean);

            requiredSlots.forEach(slot => {
                if (!presentSlots.includes(slot)) {
                    console.warn(`Missing required slot: "${slot}"`);
                }
            });
        }
    }
};
