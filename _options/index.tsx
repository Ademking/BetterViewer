/**
 * UNDER CONSTRUCTION
 * This file is under construction and not ready for use.
 */

import React from "react";
import {
  createTheme,
  MantineProvider,
  Stack,
  Text,
  Group,
  Switch,
  Card,
  Center,
  Image,
  Title,
  ColorInput,
  Slider,
  Space,
  Radio,
} from "@mantine/core";
import "@mantine/core/styles.css";
import logo from "data-base64:~assets/icon.png";
import { config } from "./OptionsConfig";

const theme = createTheme({
  colors: {
    brand: [
      "#e1f8ff",
      "#cbedff",
      "#9ad7ff",
      "#64c1ff",
      "#3aaefe",
      "#20a2fe",
      "#099cff",
      "#0088e4",
      "#0079cd",
      "#0068b6",
    ],
  },
  primaryColor: "brand",
});

type FeatureItemProps = {
  name?: string;
  description?: string;
  isEnable?: boolean;
  children?: React.ReactNode;
  isChecked?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

const FeatureItem: React.FC<FeatureItemProps> = ({
  name,
  description,
  isEnable,
  children,
  isChecked,
  onChange,
}) => (
  <Card withBorder radius="md" p="md" mb="sm" w={"100%"}>
    {children || (
      <Group justify="space-between" wrap="nowrap" gap="xl" key={name}>
        <div>
          <Text>{name}</Text>
          <Text size="xs" color="dimmed">
            {description}
          </Text>
        </div>
        <Switch
          onLabel="ON"
          offLabel="OFF"
          size="md"
          defaultChecked={isEnable}
          ml="auto"
          checked={isChecked}
          onChange={onChange}
        />
      </Group>
    )}
  </Card>
);

const SettingsCard: React.FC = () => {
  const [blurryBackground, setBlurryBackground] = React.useState(true);
  const [backgroundColor, setBackgroundColor] = React.useState("#000000");

  return (
    <Card withBorder radius="md" p="xl" w={600}>
      <Center>
        <Image src={logo} alt="BetterViewer Logo" w={100} />
      </Center>
      <Text size="lg" mt={10} ta="center">
        BetterViewer Settings
      </Text>
      <Text size="xs" color="dimmed" mt={1} mb="xl" ta="center">
        Customize your BetterViewer experience
      </Text>

      <Title order={3} mt={10} mb="md">
        General Settings
      </Title>

      <Group mb="md">
        <FeatureItem
          name="Use Blurry Background"
          description="Enable blurry background effect"
          isEnable={blurryBackground}
          isChecked={blurryBackground}
          onChange={(event) => setBlurryBackground(event.currentTarget.checked)}
        />
        <FeatureItem>
          <ColorInput
            w="100%"
            label="Use Custom Background Color"
            withAsterisk
            description="Only works when Blurry Background is disabled"
            placeholder="Background Color"
            value={backgroundColor}
            onChange={(color) => setBackgroundColor(color)}
            disabled={blurryBackground}
          />
        </FeatureItem>

        <FeatureItem>
          <Text>Zoom Ratio</Text>
          <Text size="xs" mb={10} color="dimmed">
            Adjust the zoom ratio of the viewer
          </Text>
          <Slider
            color="blue"
            showLabelOnHover={false}
            marks={[
              { value: 20, label: "20%" },
              { value: 50, label: "50%" },
              { value: 80, label: "80%" },
            ]}
            min={1}
            max={100}
          />
          <Space mt="md" />
        </FeatureItem>

        <FeatureItem>
          <Text>Toolbar Position</Text>
          <Text size="xs" mb={10} color="dimmed">
            Set the position of the toolbar
          </Text>
          <Group>
            <Radio checked label="Top" value="top" />
            <Radio label="Bottom" value="bottom" />
            <Radio label="Left" value="left" />
            <Radio label="Right" value="right" />
          </Group>
          <Space mt="md" />
        </FeatureItem>
      </Group>

      <Title order={3} mt={10} mb="md">
        Features
      </Title>
      {config.features.map((item) => (
        <FeatureItem
          key={item.name}
          name={item.name}
          description={item.description}
          isEnable={item.isEnable}
        />
      ))}
    </Card>
  );
};

const Options: React.FC = () => (
  <MantineProvider theme={theme} defaultColorScheme="dark">
    <Stack
      bg="var(--mantine-color-body)"
      align="center"
      justify="center"
      gap="md"
      pt="xl"
      pb="xl"
    >
      <SettingsCard />
    </Stack>
  </MantineProvider>
);

export default Options;
