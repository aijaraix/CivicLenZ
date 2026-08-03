import { Icon } from '@/components/icons';

const markerPositions = [
  ['one', 'Federal'], ['two', 'State'], ['three', 'Local'], ['four', 'School Board'], ['five', 'Local'], ['six', 'Federal'],
] as const;

export function MapVisual({ compact = false, labelled = true }: { compact?: boolean; labelled?: boolean }) {
  return (
    <div className={`map-visual ${compact ? 'map-visual-compact' : ''}`} aria-label="Illustrative representation map">
      <div className="map-road road-a" /><div className="map-road road-b" /><div className="map-road road-c" /><div className="map-water" />
      <div className="map-district district-a" /><div className="map-district district-b" /><div className="map-district district-c" />
      {markerPositions.map(([position, level]) => <span className={`map-marker marker-${position} marker-${level.toLowerCase().replace(' ', '-')}`} key={position}><Icon name="pin" size={18} stroke={2.4} /></span>)}
      {!compact ? <><span className="map-label label-a">Downtown</span><span className="map-label label-b">Your address</span></> : null}
      {labelled ? <div className="map-legend"><span><i className="federal" />Federal</span><span><i className="state" />State</span><span><i className="local" />Local</span><span><i className="school" />School Board</span></div> : null}
    </div>
  );
}
