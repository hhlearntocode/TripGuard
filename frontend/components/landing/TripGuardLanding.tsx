import React, { useMemo, useRef, useState } from "react";
import { LayoutChangeEvent, ScrollView, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import LandingShell from "@/components/landing/LandingShell";
import HeroShowcase from "@/components/landing/HeroShowcase";
import ProductShowcase from "@/components/landing/ProductShowcase";
import StoryChapters from "@/components/landing/StoryChapters";
import BrandValues from "@/components/landing/BrandValues";
import MembershipCta from "@/components/landing/MembershipCta";
import { useReducedMotion } from "@/components/landing/useReducedMotion";

type SectionKey = "hero" | "showcase" | "story" | "values" | "membership";

export default function TripGuardLanding() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const reduceMotion = useReducedMotion();
  const [offsets, setOffsets] = useState<Record<SectionKey, number>>({
    hero: 0,
    showcase: 0,
    story: 0,
    values: 0,
    membership: 0,
  });

  const navItems = useMemo(
    () => [
      { key: "showcase", label: "Showcase" },
      { key: "story", label: "Story" },
      { key: "values", label: "Values" },
      { key: "membership", label: "Membership" },
    ],
    []
  );

  function captureOffset(section: SectionKey) {
    return (event: LayoutChangeEvent) => {
      setOffsets((current) => ({
        ...current,
        [section]: event.nativeEvent.layout.y,
      }));
    };
  }

  function scrollToSection(section: string) {
    const nextOffset = offsets[section as SectionKey] ?? 0;
    scrollRef.current?.scrollTo({
      y: Math.max(0, nextOffset - 92),
      animated: !reduceMotion,
    });
  }

  function startExploring() {
    router.push("/onboarding/profile");
  }

  return (
    <View style={styles.page}>
      <StatusBar style="light" />
      <LandingShell
        navItems={navItems}
        onNavigate={scrollToSection}
        onStartExploring={startExploring}
        scrollRef={scrollRef}
      >
        <View nativeID="main-content" onLayout={captureOffset("hero")}>
          <HeroShowcase
            onJoinMembership={() => scrollToSection("membership")}
            onStartExploring={startExploring}
          />
        </View>

        <View onLayout={captureOffset("showcase")}>
          <ProductShowcase />
        </View>

        <View onLayout={captureOffset("story")}>
          <StoryChapters />
        </View>

        <View onLayout={captureOffset("values")}>
          <BrandValues />
        </View>

        <View onLayout={captureOffset("membership")}>
          <MembershipCta onStartExploring={startExploring} />
        </View>
      </LandingShell>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
});
