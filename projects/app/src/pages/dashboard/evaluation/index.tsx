import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import {
  Box,
  Flex,
  Grid,
  Button,
  Text,
  VStack,
  HStack,
  Icon,
  useColorModeValue,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText
} from '@chakra-ui/react';
import { serviceSideProps } from '@/web/common/i18n/utils';
import DashboardContainer from '@/pageComponents/dashboard/Container';
import MyBox from '@fastgpt/web/components/common/MyBox';
import MyIcon from '@fastgpt/web/components/common/Icon';
import { useRequest2 } from '@fastgpt/web/hooks/useRequest';
import {
  getEvaluationDatasetList,
  getEvalTargetList,
  getEvaluatorList,
  getEvalExperimentList
} from '@/web/core/evaluation/evaluation';

const EvaluationDashboard = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  // 获取统计数据
  const { data: datasetsData } = useRequest2(
    () => getEvaluationDatasetList({ pageNum: 1, pageSize: 1 }),
    {
      manual: false
    }
  );

  const { data: targetsData } = useRequest2(() => getEvalTargetList({ pageNum: 1, pageSize: 1 }), {
    manual: false
  });

  const { data: evaluatorsData } = useRequest2(
    () => getEvaluatorList({ pageNum: 1, pageSize: 1 }),
    {
      manual: false
    }
  );

  const { data: experimentsData } = useRequest2(
    () => getEvalExperimentList({ pageNum: 1, pageSize: 1 }),
    {
      manual: false
    }
  );

  const navigationCards = [
    {
      title: t('dashboard_evaluation:Evaluation_Datasets'),
      description: t('dashboard_evaluation:Evaluation_Datasets_Intro'),
      icon: 'core/dataset/datasetLight',
      path: '/dashboard/evaluation/datasets',
      color: 'blue.500',
      count: datasetsData?.total || 0
    },
    {
      title: t('dashboard_evaluation:Evaluation_Targets'),
      description: t('dashboard_evaluation:Evaluation_Targets_Intro'),
      icon: 'core/app/simpleMode',
      path: '/dashboard/evaluation/targets',
      color: 'green.500',
      count: targetsData?.total || 0
    },
    {
      title: t('dashboard_evaluation:Evaluators'),
      description: t('dashboard_evaluation:Evaluators_Intro'),
      icon: 'core/workflow/template/systemConfig',
      path: '/dashboard/evaluation/evaluators',
      color: 'purple.500',
      count: evaluatorsData?.total || 0
    },
    {
      title: t('dashboard_evaluation:Experiments'),
      description: t('dashboard_evaluation:Experiments_Intro'),
      icon: 'core/workflow/template/loop',
      path: '/dashboard/evaluation/experiments',
      color: 'orange.500',
      count: experimentsData?.total || 0
    }
  ];

  const handleCardClick = (path: string) => {
    router.push(path);
  };

  return (
    <DashboardContainer>
      {({ MenuIcon }) => (
        <MyBox>
          <VStack spacing={6} align="stretch" p={6}>
            {/* Header */}
            <Box>
              <Text fontSize="2xl" fontWeight="bold" mb={2}>
                {t('dashboard_evaluation:Evaluation_Center')}
              </Text>
              <Text color="gray.600">{t('dashboard_evaluation:Evaluation_Center_Intro')}</Text>
            </Box>

            {/* Statistics */}
            <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
              {navigationCards.map((card, index) => (
                <Stat
                  key={index}
                  bg={cardBg}
                  p={4}
                  borderRadius="lg"
                  border="1px"
                  borderColor={borderColor}
                >
                  <StatLabel color="gray.600">{card.title}</StatLabel>
                  <StatNumber color={card.color}>{card.count}</StatNumber>
                  <StatHelpText>{card.count === 1 ? 'item' : 'items'}</StatHelpText>
                </Stat>
              ))}
            </Grid>

            {/* Navigation Cards */}
            <Grid templateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap={6}>
              {navigationCards.map((card, index) => (
                <Box
                  key={index}
                  bg={cardBg}
                  p={6}
                  borderRadius="lg"
                  border="1px"
                  borderColor={borderColor}
                  cursor="pointer"
                  transition="all 0.2s"
                  _hover={{
                    transform: 'translateY(-2px)',
                    boxShadow: 'lg',
                    borderColor: card.color
                  }}
                  onClick={() => handleCardClick(card.path)}
                >
                  <VStack align="start" spacing={4}>
                    <HStack>
                      <Box p={3} borderRadius="lg" bg={`${card.color.split('.')[0]}.50`}>
                        <MyIcon name={card.icon as any} w="24px" h="24px" color={card.color} />
                      </Box>
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="semibold" fontSize="lg">
                          {card.title}
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          {card.count} {card.count === 1 ? 'item' : 'items'}
                        </Text>
                      </VStack>
                    </HStack>
                    <Text color="gray.600" fontSize="sm">
                      {card.description}
                    </Text>
                    <Button
                      size="sm"
                      colorScheme={card.color.split('.')[0]}
                      variant="outline"
                      rightIcon={<MyIcon name="common/rightArrowLight" w="14px" />}
                    >
                      {t('common:Manage')}
                    </Button>
                  </VStack>
                </Box>
              ))}
            </Grid>

            {/* Quick Actions */}
            <Box>
              <Text fontSize="lg" fontWeight="semibold" mb={4}>
                {t('dashboard_evaluation:Quick_Actions')}
              </Text>
              <HStack spacing={4}>
                <Button
                  leftIcon={<MyIcon name="common/addLight" w="14px" />}
                  colorScheme="blue"
                  onClick={() => router.push('/dashboard/evaluation/datasets/create')}
                >
                  {t('dashboard_evaluation:Create_Dataset')}
                </Button>
                <Button
                  leftIcon={<MyIcon name="core/workflow/template/loop" w="14px" />}
                  colorScheme="green"
                  variant="outline"
                  onClick={() => router.push('/dashboard/evaluation/experiments')}
                >
                  {t('dashboard_evaluation:Run_Experiment')}
                </Button>
              </HStack>
            </Box>
          </VStack>
        </MyBox>
      )}
    </DashboardContainer>
  );
};

export default EvaluationDashboard;

export async function getServerSideProps(content: any) {
  return {
    props: {
      ...(await serviceSideProps(content, ['dashboard_evaluation', 'common']))
    }
  };
}
