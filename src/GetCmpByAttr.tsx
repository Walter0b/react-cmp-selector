import React, {
    ReactElement,
    ReactNode,
    cloneElement,
    isValidElement,
    useMemo,
} from 'react'

interface GetCmpByAttrProps {
    children: ReactNode
    attr?: string
    value?: string
    props?: Record<string, any>
    debug?: boolean
}

const getCmpByAttr = ({
    children,
    attr = 'data-slot',
    value = '',
    props = {},
    debug = false,
}: GetCmpByAttrProps): ReactNode | null => {
    return useMemo(() => {
        const componentsArray: ReactNode[] = React.Children.toArray(children)

        const matchedComponent = componentsArray.find(
            (cmp): cmp is ReactElement =>
                isValidElement(cmp) && cmp.props[attr] === value
        )

        if (matchedComponent) {
            if (debug) {
                console.log(
                    'Found component with matching props:',
                    matchedComponent
                )
            }

            return cloneElement(matchedComponent, props)
        }

        if (debug) {
            console.warn(
                `No component found with attr ${attr} and value ${value}`
            )
        }
        return null
    }, [children, attr, value, props, debug])
}

export default getCmpByAttr