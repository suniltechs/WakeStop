import { StyleSheet, View } from 'react-native';

type Props = {
  color: string;
  cutoutColor?: string;
  size?: number;
};

export function BusStopIcon({
  color,
  cutoutColor = '#14213D',
  size = 32,
}: Props) {
  const scale = size / 24;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={[
        styles.container,
        {
          width: size,
          height: size,
        },
      ]}
    >
      <View
        style={[
          styles.canvas,
          {
            transform: [{ scale }],
          },
        ]}
      >
        {/* Bus Stop Sign (Pole & Round Head) */}
        <View
          style={[
            styles.signHead,
            {
              backgroundColor: color,
            },
          ]}
        />
        <View
          style={[
            styles.signPole,
            {
              backgroundColor: color,
            },
          ]}
        />

        {/* Bus Body */}
        <View
          style={[
            styles.busBody,
            {
              backgroundColor: color,
            },
          ]}
        >
          {/* Windshield */}
          <View
            style={[
              styles.windshield,
              {
                backgroundColor: cutoutColor,
              },
            ]}
          />

          {/* Headlights */}
          <View
            style={[
              styles.headlightLeft,
              {
                backgroundColor: cutoutColor,
              },
            ]}
          />
          <View
            style={[
              styles.headlightRight,
              {
                backgroundColor: cutoutColor,
              },
            ]}
          />
        </View>

        {/* Wheels */}
        <View
          style={[
            styles.wheelLeft,
            {
              backgroundColor: color,
            },
          ]}
        />
        <View
          style={[
            styles.wheelRight,
            {
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvas: {
    width: 24,
    height: 24,
  },
  signHead: {
    position: 'absolute',
    left: 2,
    top: 7,
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  signPole: {
    position: 'absolute',
    left: 3.75,
    top: 11.5,
    width: 1.5,
    height: 8.5,
    borderRadius: 0.75,
  },
  busBody: {
    position: 'absolute',
    left: 9.5,
    top: 4,
    width: 13,
    height: 13,
    borderTopLeftRadius: 3.5,
    borderTopRightRadius: 3.5,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  windshield: {
    position: 'absolute',
    left: 1.5,
    top: 2.5,
    width: 10,
    height: 4.5,
    borderRadius: 1,
  },
  headlightLeft: {
    position: 'absolute',
    left: 2.2,
    bottom: 2,
    width: 2.2,
    height: 2.2,
    borderRadius: 1.1,
  },
  headlightRight: {
    position: 'absolute',
    right: 2.2,
    bottom: 2,
    width: 2.2,
    height: 2.2,
    borderRadius: 1.1,
  },
  wheelLeft: {
    position: 'absolute',
    left: 10.8,
    top: 17,
    width: 2.6,
    height: 2.6,
    borderBottomLeftRadius: 1.2,
    borderBottomRightRadius: 1.2,
  },
  wheelRight: {
    position: 'absolute',
    left: 18.6,
    top: 17,
    width: 2.6,
    height: 2.6,
    borderBottomLeftRadius: 1.2,
    borderBottomRightRadius: 1.2,
  },
});
