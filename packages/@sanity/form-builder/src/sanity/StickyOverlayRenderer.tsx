import * as React from 'react'
import {createIntersectionObserver} from './intersectionObserver'
import {tap} from 'rxjs/operators'
import {groupBy} from 'lodash'

const DEBUG = false

const OVERLAY_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  pointerEvents: 'none',
  background: DEBUG ? 'rgba(255, 255, 0, 0.25)' : ''
}

const TRANSITION = {
  transitionProperty: 'top, left',
  transitionDuration: '0.4s'
}

const OVERLAY_ITEM_STYLE: React.CSSProperties = {
  background: DEBUG ? 'rgba(255, 0, 0, 0.25)' : '',
  overflow: 'hidden',
  pointerEvents: 'all',
  outline: '1px solid #00b',
  position: 'absolute'
}

const WithIntersection = props => {
  const {onIntersection, io, id, ...rest} = props
  const element = React.useRef()
  React.useEffect(() => {
    const io = createIntersectionObserver({threshold: [0, 0.01, 0.1, 0.2, 0.8, 0.9, 0.99, 1]})
    const sub = io
      .observe(element.current)
      .pipe(tap(entry => onIntersection(id, entry)))
      .subscribe()
    return () => sub.unsubscribe()
  }, [io])

  return <div ref={element} {...rest} />
}

export function StickyOverlayRenderer(props) {
  const {items, render, children, trackerRef} = props

  const io = React.useMemo(() => createIntersectionObserver({threshold: [0, 0.1, 0.5, 0.9, 1]}), [])

  const [intersections, setIntersections] = React.useState({})

  const onIntersection = React.useCallback((id, entry) => {
    setIntersections(current => ({...current, [id]: entry}))
  }, [])

  const top = intersections['::top']
  const bottom = intersections['::bottom']
  const positions =
    top && bottom
      ? items
          .map(item => {
            const intersection = intersections[item.id]
            if (!intersection) {
              return null
            }

            const distanceTop = intersection.boundingClientRect.top - top.boundingClientRect.bottom

            const distanceBottom =
              bottom.boundingClientRect.bottom - intersection.boundingClientRect.bottom

            // const inside = intersection.isIntersecting && !above && !below

            return {
              distanceTop,
              distanceBottom,
              item
            }
          })
          .filter(Boolean)
      : []

  const groups = {
    inside: [],
    below: [],
    above: [],
    ...groupBy(positions, e =>
      e.distanceTop < -20 ? 'above' : e.distanceBottom < -10 ? 'below' : 'inside'
    )
  }
  return (
    <div style={{position: 'relative'}}>
      <WithIntersection
        io={io}
        id="::top"
        onIntersection={onIntersection}
        style={{
          position: 'sticky',
          top: 0,
          height: 1,
          backgroundColor: DEBUG ? 'red' : 'none'
        }}
      />
      {render.above(groups.above)}
      {render.inside(groups.inside)}
      <div ref={trackerRef}>{children}</div>
      {render.below(groups.below)}
      <div style={OVERLAY_STYLE}>
        {items.map(item => {
          return (
            <WithIntersection
              io={io}
              onIntersection={onIntersection}
              key={item.id}
              id={item.id}
              style={{
                ...OVERLAY_ITEM_STYLE,
                width: item.rect.width,
                left: item.rect.left,
                top: item.rect.top - 30,
                height: item.rect.height + 60,
                visibility: DEBUG ? 'visible' : 'hidden'
              }}
            />
          )
        })}
      </div>
      <div style={{padding: 20}} />
      <WithIntersection
        id="::bottom"
        io={io}
        onIntersection={onIntersection}
        style={{
          position: 'sticky',
          bottom: 0,
          height: 1,
          backgroundColor: DEBUG ? 'blue' : 'none'
        }}
      />
    </div>
  )
}